// POST /api/duel-accept
// 被邀请方同意 1V1：仅 to_account 本人可操作。成功后房间转为 playing，返回房间信息。
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

  const inviteId = (body.invite_id || '').trim();
  if (!inviteId) return json({ ok: false, msg: '缺少邀请 ID' }, 400);

  const meUser = await db.prepare('SELECT account,name FROM users WHERE id=?').bind(me.id).first();
  if (!meUser) return json({ ok: false, msg: '账号不存在' }, 404);

  const invite = await db.prepare('SELECT * FROM duel_invites WHERE id=?').bind(inviteId).first();
  if (!invite) return json({ ok: false, msg: '邀请不存在' }, 404);
  if (invite.status !== 'pending') return json({ ok: false, msg: '邀请已处理' }, 409);
  if (invite.to_account !== meUser.account) return json({ ok: false, msg: '无权操作该邀请' }, 403);

  const room = await db.prepare('SELECT * FROM duel_rooms WHERE room_id=?').bind(invite.room_id).first();
  if (!room) return json({ ok: false, msg: '房间不存在' }, 404);

  const now = Date.now();
  await db.prepare("UPDATE duel_invites SET status='accepted', updated_at=? WHERE id=?").bind(now, inviteId).run();
  await db.prepare(
    "UPDATE duel_rooms SET status='playing', guest_account=?, guest_snap='{}', guest_bullets='[]', phase='fight', phase_until=0, round_closed=0, updated_at=? WHERE room_id=?"
  ).bind(meUser.account, now, invite.room_id).run();

  return json({
    ok: true,
    roomId: invite.room_id,
    seed: invite.seed,
    hostName: invite.from_name,
    hostAccount: invite.from_account
  });
}
