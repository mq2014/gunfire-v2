// GET /api/profile  —— 校验 Bearer token，返回当前账号信息
import { verifyToken, json } from './_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = await verifyToken(token);
  if (!user) return json({ ok: false, msg: '未登录或登录已失效' }, 401);
  const row = await env.DB.prepare('SELECT name, account FROM users WHERE id=?').bind(user.id).first();
  if (!row) return json({ ok: false, msg: '账号不存在' }, 401);
  return json({ ok: true, name: row.name, account: row.account });
}
