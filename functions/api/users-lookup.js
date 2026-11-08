// GET /api/users/lookup?q=xxx —— 校验某个名称/账号是否为真实注册用户
// 前端添加好友时用它做硬性校验，杜绝把 AI/模拟名字加成好友。
import { verifyToken, json } from './_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return json({ ok: false, msg: '缺少查询' }, 400);
  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);
  try {
    const u = await db.prepare(
      'SELECT id, name, account FROM users WHERE lower(name)=lower(?) OR lower(account)=lower(?) LIMIT 1'
    ).bind(q, q).first();
    if (!u) return json({ ok: true, found: false });
    return json({ ok: true, found: true, name: u.name, account: u.account });
  } catch (e) {
    return json({ ok: false, msg: '服务器错误' }, 500);
  }
}
