// POST /api/duel-decline
// 拒绝 / 取消 1V1 邀请：发起人或被邀请人都可以把 pending 邀请置为 declined。
import { verifyToken, json } from './_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, msg: '请求格式错误' }, 400); }
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const me = await verifyToken(token);
  if (!me) return json({ ok: false, msg: '未登录' }, 401);
  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);

  const inviteId = (body.invite_id || '').trim();
  if (!inviteId) return json({ ok: false, msg: '缺少邀请 ID' }, 400);

  const meUser = await db.prepare('SELECT account FROM users WHERE id=?').bind(me.id).first();
  if (!meUser) return json({ ok: false, msg: '账号不存在' }, 404);

  await db.prepare(
    "UPDATE duel_invites SET status='declined', updated_at=? WHERE id=? AND status='pending' AND (from_account=? OR to_account=?)"
  ).bind(Date.now(), inviteId, meUser.account, meUser.account).run();

  return json({ ok: true });
}
