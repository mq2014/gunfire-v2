// GET /api/blacklist —— 黑名单（仅被封禁的账号）。与后台「黑名单」面板对应。
// 公开接口：门禁由前端后台密码承担，无需登录 token（与 /api/stats-users 一致）。
// 返回：
//   total     : 被封禁的账号数
//   users     : 被封禁账号列表 [{ name, account, online }]
import { json } from './_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);
  try {
    const rows = await db.prepare(`
      SELECT u.name AS name, u.account AS account,
             COALESCE((SELECT p.online FROM presence p WHERE p.user_id = u.id LIMIT 1), 0) AS online
      FROM users u
      WHERE u.banned = 1
      ORDER BY u.logged_in_at DESC
    `).all();
    const users = (rows && rows.results) ? rows.results.map(function (r) {
      return {
        name: r.name,
        account: r.account,
        online: r.online === 1 || r.online === true
      };
    }) : [];
    return json({ ok: true, total: users.length, users: users });
  } catch (e) {
    return json({ ok: false, msg: '服务器错误' }, 500);
  }
}
