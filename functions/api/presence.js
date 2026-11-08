// POST /api/presence —— 客户端上报自己的真实在线状态
// body: { status: 'open' | 'playing' | 'offline' }
// 服务端只存客户端上报的真值，绝不模拟。online=0 表示离线。
import { verifyToken, json } from './_auth.js';

const VALID = { open: 1, playing: 1, offline: 0 };

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = await verifyToken(token);
  if (!user) return json({ ok: false, msg: '未登录' }, 401);
  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const status = VALID.hasOwnProperty(body.status) ? body.status : 'open';
  const online = VALID[status];
  const now = Date.now();
  try {
    await db.prepare(`
      INSERT INTO presence (user_id, online, status, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET online=excluded.online, status=excluded.status, updated_at=excluded.updated_at
    `).bind(user.id, online, status, now).run();
    // 一旦上报过 playing（进入对局），标记该用户「曾游玩」——用于后台统计「未开始游玩」人数
    if (status === 'playing') {
      await db.prepare('UPDATE users SET ever_played = 1 WHERE id = ?').bind(user.id).run();
    }
    return json({ ok: true, status: status });
  } catch (e) {
    return json({ ok: false, msg: '服务器错误' }, 500);
  }
}
