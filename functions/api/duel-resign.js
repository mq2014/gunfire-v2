// POST /api/duel-resign
// 认输 / 退出：将房间标记为 finished，对手获胜。客户端离开 1V1 时调用，让对端及时结束。
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

  const roomId = (body.room || '').trim();
  if (!roomId) return json({ ok: false, msg: '缺少房间' }, 400);

  const meUser = await db.prepare('SELECT account FROM users WHERE id=?').bind(me.id).first();
  if (!meUser) return json({ ok: false, msg: '账号不存在' }, 404);

  const room = await db.prepare('SELECT * FROM duel_rooms WHERE room_id=?').bind(roomId).first();
  if (!room) return json({ ok: false, msg: '房间不存在' }, 404);

  const role = meUser.account === room.host_account ? 'host'
    : meUser.account === room.guest_account ? 'guest' : null;
  if (!role) return json({ ok: false, msg: '你不在该房间' }, 403);
  if (room.status === 'finished') return json({ ok: true });

  const winner = role === 'host' ? 'guest' : 'host';
  await db.prepare(
    "UPDATE duel_rooms SET status='finished', winner=?, phase='fight', round_closed=0, updated_at=? WHERE room_id=?"
  ).bind(winner, Date.now(), roomId).run();

  return json({ ok: true, winner });
}
