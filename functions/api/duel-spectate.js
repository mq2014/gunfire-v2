// POST /api/duel-spectate
// 观战：仅真实好友、且对方正在进行 1V1 时，返回房间双方的快照/子弹/比分（只读，绝不模拟）。
// 说明：战役/单人模式是本地运行、无服务器数据，故只能观战 1V1。
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

  const target = (body.account || '').trim();
  if (!target) return json({ ok: false, msg: '缺少目标账号' }, 400);

  // 目标必须是真实注册账号
  const tu = await db.prepare('SELECT id, name, account FROM users WHERE account=?').bind(target).first();
  if (!tu) return json({ ok: false, msg: '目标不是真实注册账号' }, 404);

  // 必须是真实好友（user_id / friend_id 双向校验，status='accepted'）
  const fr = await db.prepare(
    "SELECT 1 FROM friends WHERE ((user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?)) AND status='accepted' LIMIT 1"
  ).bind(me.id, tu.id, tu.id, me.id).first();
  if (!fr) return json({ ok: false, isFriend: false, msg: '只能观战真实好友的对局' }, 403);

  // 查找目标正在进行的 1V1 房间（host 或 guest 均可）
  const room = await db.prepare(
    "SELECT * FROM duel_rooms WHERE (host_account=? OR guest_account=?) AND status='playing' ORDER BY updated_at DESC LIMIT 1"
  ).bind(target, target).first();
  if (!room) return json({ ok: true, playing: false, msg: '该好友当前没有进行中的 1V1 对局' });

  const hostU = await db.prepare('SELECT name FROM users WHERE account=?').bind(room.host_account).first();
  const guestU = await db.prepare('SELECT name FROM users WHERE account=?').bind(room.guest_account).first();

  const parse = (j) => { try { return JSON.parse(j); } catch (e) { return null; } };
  const hostSnap = parse(room.host_snap);
  const guestSnap = parse(room.guest_snap);
  const hostBullets = parse(room.host_bullets) || [];
  const guestBullets = parse(room.guest_bullets) || [];

  return json({
    ok: true, playing: true,
    roomId: room.room_id, seed: room.seed,
    phase: room.phase, phaseUntil: room.phase_until,
    status: room.status, winner: room.winner,
    hostName: hostU ? hostU.name : room.host_account,
    guestName: guestU ? guestU.name : room.guest_account,
    hostAccount: room.host_account, guestAccount: room.guest_account,
    hostSnap, guestSnap, hostBullets, guestBullets,
    scores: { host: room.host_score, guest: room.guest_score }
  });
}
