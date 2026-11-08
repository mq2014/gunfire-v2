// GET /api/stats-users?page=1&pageSize=15 —— 登录过游戏的人的名单（公开接口：门禁由前端密码 asdfghjkl 承担，无需登录 token）
// 与后台统计面板「登录过游戏的总人数」对应：列出所有已登录过、且未被封禁的注册账号（按登录时间倒序）。
// 注意：被封禁的账号（banned=1）不在此名单出现，而是归入「黑名单」(/api/blacklist)。
// 返回：
//   total     : 已登录且未封禁的注册账号数（即名单条数；若有仅在线记录但无账号名的孤儿会话，另以 orphan 返回）
//   page      : 当前页
//   pageSize  : 每页条数
//   pages     : 总页数
//   orphan    : 仅有在线记录、但 users 表无对应账号行的会话数（无账号名，不计入名单）
//   users     : 当前页账号 [{ name, account, loggedInAt, online, everPlayed }]
import { verifyToken, json } from './_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  // 门禁由前端密码 asdfghjkl 承担：本接口本身无需登录即可查看全员名单。
  // 但若调用方同时带了有效登录 token，则额外为每行计算 isFriend（标记“我的好友”）。
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = await verifyToken(token); // 无效/缺失 → null → 不标记好友
  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);
  try {
    const url = new URL(request.url);
    let page = parseInt(url.searchParams.get('page') || '1', 10);
    let pageSize = parseInt(url.searchParams.get('pageSize') || '15', 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 15;
    if (pageSize > 50) pageSize = 50;
    const offset = (page - 1) * pageSize;

    const totalRow = await db.prepare(
      `SELECT COUNT(*) AS c FROM users WHERE logged_in_at IS NOT NULL AND COALESCE(banned,0)=0`
    ).first();
    const total = totalRow ? totalRow.c : 0;

    const orphanRow = await db.prepare(
      `SELECT COUNT(*) AS c FROM presence p WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.user_id)`
    ).first();
    const orphan = orphanRow ? orphanRow.c : 0;

    const pages = Math.max(1, Math.ceil(total / pageSize));

    // 仅登录时计算“是否我的好友”（friends 表 accepted 关系），否则恒为 0
    const friendCol = user
      ? `(SELECT 1 FROM friends f WHERE f.user_id = ? AND f.friend_id = u.id AND f.status = 'accepted')`
      : `0`;

    const sql = `
      SELECT u.name AS name, u.account AS account,
             u.logged_in_at AS loggedInAt,
             COALESCE((SELECT p.online FROM presence p WHERE p.user_id = u.id LIMIT 1), 0) AS online,
             COALESCE(u.ever_played, 0) AS everPlayed,
             COALESCE(${friendCol}, 0) AS isFriend
      FROM users u
      WHERE u.logged_in_at IS NOT NULL AND COALESCE(u.banned,0)=0
      ORDER BY u.logged_in_at DESC
      LIMIT ? OFFSET ?
    `;
    // 登录时：子查询占位符 + LIMIT/OFFSET 共 3 个参数；未登录时：仅 LIMIT/OFFSET 共 2 个参数
    const rows = user
      ? await db.prepare(sql).bind(user.id, pageSize, offset).all()
      : await db.prepare(sql).bind(pageSize, offset).all();

    return json({
      ok: true,
      total: total,
      page: page,
      pageSize: pageSize,
      pages: pages,
      orphan: orphan,
      friendTagged: !!user,
      users: (rows && rows.results) ? rows.results.map(function (r) {
        return {
          name: r.name,
          account: r.account,
          loggedInAt: r.loggedInAt,
          online: r.online === 1 || r.online === true,
          everPlayed: r.everPlayed === 1 || r.everPlayed === true,
          isFriend: (r.isFriend === 1 || r.isFriend === true)
        };
      }) : []
    });
  } catch (e) {
    return json({ ok: false, msg: '服务器错误' }, 500);
  }
}
