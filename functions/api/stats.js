// GET /api/stats —— 隐藏后台统计（公开接口：门禁由前端密码 asdfghjkl 承担，无需登录 token）
// 返回：
//   totalLoggedIn    : 登录过游戏的总人数
//                       = 已登录过的账号(users.logged_in_at 非空) + 仅有在线记录但账号行缺失的孤儿会话(presence 孤儿)
//                       这样即使账号行被清理，当前/历史真实登录会话仍被计入，避免漏算。
//   stillOnline      : 登录了且未退出登录状态的人数（presence.online=1，即当前在线/游戏中）
//   loggedOutNoPlay  : 登录过、但最后退出了登录状态、且从未开始游玩的人数
//                       (users.logged_in_at 非空 AND 当前 offline AND ever_played=0)
import { json } from './_auth.js';

export async function onRequestGet(context) {
  const { env } = context;
  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);
  try {
    const usersLoggedIn = await db.prepare(
      `SELECT COUNT(*) AS c FROM users WHERE logged_in_at IS NOT NULL`
    ).first();
    // 孤儿会话：有 presence 记录、但 users 表里已无对应账号行（例如账号被清理但仍上报过在线）
    const orphan = await db.prepare(
      `SELECT COUNT(*) AS c FROM presence p WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.user_id)`
    ).first();
    const still = await db.prepare(
      `SELECT COUNT(*) AS c FROM presence WHERE online = 1`
    ).first();
    const noPlay = await db.prepare(`
      SELECT COUNT(*) AS c FROM users u
      LEFT JOIN presence p ON p.user_id = u.id
      WHERE u.logged_in_at IS NOT NULL
        AND COALESCE(p.online, 0) = 0
        AND COALESCE(u.ever_played, 0) = 0
    `).first();
    const total = (usersLoggedIn ? usersLoggedIn.c : 0) + (orphan ? orphan.c : 0);
    return json({
      ok: true,
      totalLoggedIn: total,
      stillOnline: still ? still.c : 0,
      loggedOutNoPlay: noPlay ? noPlay.c : 0
    });
  } catch (e) {
    return json({ ok: false, msg: '服务器错误' }, 500);
  }
}
