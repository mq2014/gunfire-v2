// GET /api/duel-invites
// 返回当前用户相关的 1V1 邀请：incoming=别人发给我的（pending），outgoing=我发出的（pending）。
import { verifyToken, json } from './_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const me = await verifyToken(token);
  if (!me) return json({ ok: false, msg: '未登录' }, 401);
  const db = env.DB;
  if (!db) return json({ ok: false, msg: '数据库未配置' }, 503);

  const meUser = await db.prepare('SELECT account FROM users WHERE id=?').bind(me.id).first();
  if (!meUser) return json({ ok: false, msg: '账号不存在' }, 404);

  const incoming = await db.prepare(
    "SELECT id,from_account,from_name,status,seed,room_id FROM duel_invites WHERE to_account=? AND status='pending' ORDER BY created_at DESC LIMIT 10"
  ).bind(meUser.account).all();
  // 外出邀请需包含 accepted/declined，供房主轮询「对方是否已同意/拒绝」后进入房间
  const outgoing = await db.prepare(
    "SELECT id,to_account,to_name,status,seed,room_id FROM duel_invites WHERE from_account=? AND status IN ('pending','accepted','declined') ORDER BY created_at DESC LIMIT 10"
  ).bind(meUser.account).all();

  return json({
    ok: true,
    incoming: (incoming && incoming.results) || [],
    outgoing: (outgoing && outgoing.results) || []
  });
}
