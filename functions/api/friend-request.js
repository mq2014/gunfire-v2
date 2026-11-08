// POST /api/friend/request —— 向一个真实注册用户发送好友请求
// body: { account?: string, name?: string }  target 必须是真实存在的账号，否则拒绝。
import { verifyToken, json } from './_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = await verifyToken(token);
  if (!user) return json({ ok: false, msg: '未登录' }, 401);
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, msg: '请求格式错误' }, 400); }
  const target = (body.account || body.name || '').trim();
  if (!target) return json({ ok: false, msg: '请填写对方账号' }, 400);
  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);
  try {
    const tu = await db.prepare(
      'SELECT id, name, account FROM users WHERE lower(name)=lower(?) OR lower(account)=lower(?) LIMIT 1'
    ).bind(target, target).first();
    if (!tu) return json({ ok: false, msg: '未找到该注册用户（好友必须是真实注册账号）' }, 404);
    if (tu.id === user.id) return json({ ok: false, msg: '不能添加自己为好友' }, 400);
    const ex = await db.prepare('SELECT id FROM friends WHERE user_id=? AND friend_id=?').bind(user.id, tu.id).first();
    if (ex) return json({ ok: false, msg: '已发送过好友请求或已是好友' }, 409);
    await db.prepare(
      'INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?,?,?,?)'
    ).bind(user.id, tu.id, 'pending', Date.now()).run();
    return json({ ok: true, name: tu.name, account: tu.account });
  } catch (e) {
    return json({ ok: false, msg: '服务器错误' }, 500);
  }
}
