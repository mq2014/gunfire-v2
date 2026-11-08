// GET /api/friends —— 返回当前登录用户的好友列表（仅真实注册用户，含真实在线状态）
// 在线判定：presence.online=1 且 updated_at 在 90 秒内视为在线；否则离线。
// status: playing=游戏中 | open=已开启游戏 | offline=离线
import { verifyToken, json } from './_auth.js';

const ONLINE_WINDOW = 90 * 1000;

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = await verifyToken(token);
  if (!user) return json({ ok: false, msg: '未登录' }, 401);
  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);
  try {
    const now = Date.now();
    const rows = await db.prepare(`
      SELECT u.name, u.account,
             COALESCE(p.online, 0) AS online,
             COALESCE(p.status, '') AS pstatus,
             COALESCE(p.updated_at, 0) AS updated_at
      FROM friends f
      JOIN users u ON u.id = f.friend_id
      LEFT JOIN presence p ON p.user_id = u.id
      WHERE f.user_id = ? AND f.status = 'accepted'
      ORDER BY u.name
    `).bind(user.id).all();
    const list = (rows.results || []).map(r => {
      const isOnline = r.online === 1 && (now - r.updated_at) < ONLINE_WINDOW;
      return {
        name: r.name,
        account: r.account,
        online: isOnline,
        status: isOnline ? (r.pstatus || 'open') : 'offline'
      };
    });
    return json({ ok: true, friends: list });
  } catch (e) {
    return json({ ok: false, msg: '服务器错误' }, 500);
  }
}
