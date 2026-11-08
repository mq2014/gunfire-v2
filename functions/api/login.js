// POST /api/login  —— 登录或注册（与前端「登录 / 注册」按钮语义一致）
// 提交 { name, account, password }：
//   · name 已存在 → 校验 account+password，匹配则登录，否则提示名称被占用
//   · name 不存在 → 新建账号并登录
import { sha256Hex, makeToken, json } from './_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, msg: '请求格式错误' }, 400); }

  const name = (body.name || '').trim();
  const account = (body.account || '').trim();
  const password = body.password || '';
  if (!name || !account || !password) return json({ ok: false, msg: '请填写名称、账号与密码' }, 400);
  if (name.length > 16 || account.length > 32 || password.length > 64) return json({ ok: false, msg: '输入过长' }, 400);

  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);   // D1 绑定缺失 → 前端会回落本地登录
  const dupErr = '名称已被占用，请更换名称';
  try {
    const existing = await db
      .prepare('SELECT id,name,account,pw_hash,salt,banned FROM users WHERE lower(name)=lower(?)')
      .bind(name).first();
    if (existing) {
      const ok = existing.account === account && existing.pw_hash === await sha256Hex(existing.salt + password);
      if (!ok) return json({ ok: false, msg: dupErr }, 409);
      if (existing.banned) return json({ ok: false, msg: '禁止登录', banned: true }, 403);
      await db.prepare('UPDATE users SET logged_in_at = ? WHERE id = ?').bind(Date.now(), existing.id).run();
      const token = await makeToken(existing.id, existing.name);
      return json({ ok: true, token, name: existing.name });
    }
    // 新用户：随机盐 + SHA-256 哈希
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const pwHash = await sha256Hex(salt + password);
    const res = await db
      .prepare('INSERT INTO users (name, account, pw_hash, salt, created_at, logged_in_at) VALUES (?,?,?,?,?,?)')
      .bind(name, account, pwHash, salt, Date.now(), Date.now()).run();
    const newId = res.meta && res.meta.last_row_id ? res.meta.last_row_id : 0;
    const token = await makeToken(newId, name);
    return json({ ok: true, token, name });
  } catch (e) {
    return json({ ok: false, msg: '服务器错误' }, 500);
  }
}
