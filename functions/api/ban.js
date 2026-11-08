// POST /api/ban —— 后台封禁 / 解封账号（需后台密码 asdfghjkl，门禁与前端后台一致）
// 提交 { account, password, banned }：
//   · password   : 后台密码（前端「后台密码」面板输入的 asdfghjkl），不匹配 → 403
//   · account    : 要封禁 / 解封的账号
//   · banned     : 1=封禁，0=解封
// 被封禁的账号再次登录（相同账号+密码）时，login 直接返回 禁止登录（403）。
import { json } from './_auth.js';

// 后台密码：优先取环境变量 GF_ADMIN_PASS，否则回落到与前端一致的默认值
const ADMIN_PASS = (typeof process !== 'undefined' && process.env && process.env.GF_ADMIN_PASS) || 'asdfghjkl';

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, msg: '请求格式错误' }, 400); }

  const password = body.password || '';
  const account = (body.account || '').trim();
  const banned = body.banned ? 1 : 0;

  if (password !== ADMIN_PASS) return json({ ok: false, msg: '密码错误' }, 403);
  if (!account) return json({ ok: false, msg: '缺少账号' }, 400);

  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);
  try {
    const u = await db
      .prepare('SELECT id FROM users WHERE lower(account)=lower(?)')
      .bind(account).first();
    if (!u) return json({ ok: false, msg: '账号不存在' }, 404);
    await db
      .prepare('UPDATE users SET banned = ? WHERE id = ?')
      .bind(banned, u.id).run();
    return json({ ok: true, banned: banned === 1, account: account, msg: banned ? '已封禁' : '已解封' });
  } catch (e) {
    return json({ ok: false, msg: '服务器错误' }, 500);
  }
}
