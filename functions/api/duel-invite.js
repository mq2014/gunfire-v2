// POST /api/duel-invite
// 发起 1V1 对战邀请：仅限真实注册好友。创建邀请 + 房间（waiting），返回 inviteId/roomId/seed。
import { verifyToken, json } from './_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, msg: '请求格式错误' }, 400); }

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const me = await verifyToken(token);
  if (!me) return json({ ok: false, msg: '未登录' }, 401);

  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);

  const toName = (body.to_name || '').trim();
  const toAccount = (body.to_account || '').trim();
  if (!toAccount) return json({ ok: false, msg: '缺少对方账号' }, 400);

  const meUser = await db.prepare('SELECT account,name FROM users WHERE id=?').bind(me.id).first();
  if (!meUser) return json({ ok: false, msg: '账号不存在' }, 404);
  // 不能邀请自己
  if (meUser.account === toAccount) return json({ ok: false, msg: '不能与自己对战' }, 400);

  // 必须是真实好友
  const toUser = await db.prepare('SELECT id,account,name FROM users WHERE account=?').bind(toAccount).first();
  if (!toUser) return json({ ok: false, msg: '对方不是真实注册账号' }, 404);
  const fr = await db.prepare(
    'SELECT 1 FROM friends f JOIN users u ON u.id=f.friend_id WHERE f.user_id=? AND u.account=? AND f.status=?'
  ).bind(me.id, toAccount, 'accepted').first();
  if (!fr) return json({ ok: false, msg: '对方不是你的好友' }, 403);

  // 清理该发起人对同一对象的旧 pending 邀请，避免堆积
  await db.prepare("DELETE FROM duel_invites WHERE from_account=? AND to_account=? AND status='pending'")
    .bind(meUser.account, toAccount).run();

  const inviteId = crypto.randomUUID();
  const roomId = crypto.randomUUID();
  const seed = (crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0;
  const now = Date.now();
  await db.prepare(
    'INSERT INTO duel_invites (id,from_account,from_name,to_account,to_name,status,room_id,seed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).bind(inviteId, meUser.account, meUser.name, toAccount, toName, 'pending', roomId, seed, now, now).run();
  await db.prepare(
    'INSERT INTO duel_rooms (room_id,status,seed,host_account,host_snap,guest_snap,host_bullets,guest_bullets,host_score,guest_score,phase,phase_until,round_closed,winner,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(roomId, 'waiting', seed, meUser.account, '{}', '{}', '[]', '[]', 0, 0, 'fight', 0, 0, '', now).run();

  return json({ ok: true, inviteId, roomId, seed });
}
