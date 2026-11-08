// POST /api/friend-reject —— 拒绝（删除）一条待处理好友申请
// body: { account?: string, name?: string }  指定请求发起方。
import { verifyToken, json } from './_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = await verifyToken(token);
  if (!user) return json({ ok: false, msg: '未登录' }, 401);
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, msg: '请求格式错误' }, 400); }
  const by = (body.account || body.name || '').trim();
  if (!by) return json({ ok: false, msg: '请填写请求方账号' }, 400);
  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);
  try {
    const bu = await db.prepare(
      'SELECT id FROM users WHERE lower(name)=lower(?) OR lower(account)=lower(?) LIMIT 1'
    ).bind(by, by).first();
    if (!bu) return json({ ok: false, msg: '请求方不存在' }, 404);
    await db.prepare(
      "DELETE FROM friends WHERE user_id=? AND friend_id=? AND status='pending'"
    ).bind(bu.id, user.id).run();
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, msg: '服务器错误' }, 500);
  }
}
