// GET /api/friend-requests —— 返回当前用户收到的待处理好友申请
// 即 friends 表中 friend_id = 当前用户 且 status = 'pending' 的行，
// 发起方为 user_id 对应的真实注册用户。
import { verifyToken, json } from './_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = await verifyToken(token);
  if (!user) return json({ ok: false, msg: '未登录' }, 401);
  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);
  try {
    const rows = await db.prepare(`
      SELECT u.name, u.account
      FROM friends f
      JOIN users u ON u.id = f.user_id
      WHERE f.friend_id = ? AND f.status = 'pending'
      ORDER BY u.name
    `).bind(user.id).all();
    const list = (rows.results || []).map(r => ({ name: r.name, account: r.account }));
    return json({ ok: true, requests: list });
  } catch (e) {
    return json({ ok: false, msg: '服务器错误' }, 500);
  }
}
