// POST /api/duel-tick
// 1V1 实时同步：客户端每 ~140ms 上报自己的快照 + 新子弹，并取回对手的快照 + 新子弹。
// 计分 / 复活由服务端权威处理（先死亡者判负，对方 +1 分），绝不模拟对手数据。
import { verifyToken, json } from './_auth.js';

const WIN = 4;            // 先赢 4 回合者胜
const RESPAWN_MS = 1600;  // 回合结束冻结时长

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
  if (room.status !== 'playing') return json({ ok: false, msg: '对战未开始或已结束', status: room.status }, 409);

  const now = Date.now();

  // 解析并合并我方外发子弹（按 id 去重，封顶保留最近 140 发）
  let myBullets = [];
  try { myBullets = JSON.parse(role === 'host' ? room.host_bullets : room.guest_bullets) || []; } catch (e) { myBullets = []; }
  const incoming = Array.isArray(body.bullets) ? body.bullets : [];
  for (const b of incoming) {
    if (b && typeof b.id === 'number' && !myBullets.some(x => x.id === b.id)) myBullets.push(b);
  }
  if (myBullets.length > 140) myBullets = myBullets.slice(-140);

  // 我方快照
  const mySnap = JSON.stringify(body.snap && typeof body.snap === 'object' ? body.snap : {});

  // 结算：本回合首次上报死亡 → 对方得分；达到 WIN 则结束，否则进入复活冻结
  if (body.dead && room.phase === 'fight' && !room.round_closed) {
    room.round_closed = 1;
    if (role === 'host') room.guest_score = (room.guest_score || 0) + 1;
    else room.host_score = (room.host_score || 0) + 1;
    const oppScore = role === 'host' ? room.guest_score : room.host_score;
    if (oppScore >= WIN) {
      room.status = 'finished';
      room.winner = role === 'host' ? 'guest' : 'host';
    } else {
      room.phase = 'respawn';
      room.phase_until = now + RESPAWN_MS;
    }
  }

  // 自动推进：复活冻结到期 → 新一回合
  if (room.phase === 'respawn' && now >= (room.phase_until || 0)) {
    room.phase = 'fight';
    room.round_closed = 0;
    room.host_bullets = '[]';
    room.guest_bullets = '[]';
  }

  // 持久化
  if (role === 'host') {
    room.host_snap = mySnap; room.host_bullets = JSON.stringify(myBullets);
  } else {
    room.guest_snap = mySnap; room.guest_bullets = JSON.stringify(myBullets);
  }
  await db.prepare(
    'UPDATE duel_rooms SET host_snap=?, guest_snap=?, host_bullets=?, guest_bullets=?, host_score=?, guest_score=?, phase=?, phase_until=?, round_closed=?, status=?, winner=?, updated_at=? WHERE room_id=?'
  ).bind(
    room.host_snap, room.guest_snap, room.host_bullets, room.guest_bullets,
    room.host_score, room.guest_score, room.phase, room.phase_until, room.round_closed,
    room.status, room.winner, now, roomId
  ).run();

  // 组装返回：对手快照 + 对手新子弹（id > lastSeen）
  const oppRole = role === 'host' ? 'guest' : 'host';
  let oppSnap = null;
  try {
    const s = oppRole === 'guest' ? room.guest_snap : room.host_snap;
    const o = JSON.parse(s);
    if (o && typeof o.x === 'number') oppSnap = o;
  } catch (e) { oppSnap = null; }
  let oppBullets = [];
  try { oppBullets = JSON.parse(oppRole === 'guest' ? room.guest_bullets : room.host_bullets) || []; } catch (e) { oppBullets = []; }
  const lastSeen = typeof body.lastSeen === 'number' ? body.lastSeen : 0;
  const newOpp = oppBullets.filter(b => b && b.id > lastSeen);

  return json({
    ok: true,
    opp: oppSnap,
    oppBullets: newOpp,
    scores: { host: room.host_score, guest: room.guest_score },
    phase: room.phase,
    phaseUntil: room.phase_until,
    status: room.status,
    winner: room.winner
  });
}
