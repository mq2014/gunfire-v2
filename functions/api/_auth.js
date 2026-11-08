// 共享鉴权工具（Pages Functions 内部模块，以下划线开头不会成为路由）
// 密码使用 SHA-256 + 随机盐哈希；登录态 token 为「载荷.HMAC」的无状态签名，
// 服务端用同一 SECRET 校验，无需额外会话表。

export const SECRET = 'gunfire-v2-static-secret-v1';

export function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function b64url(s) {
  // 支持 UTF-8（中文用户名）：先转字节再用 btoa
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return bufToHex(d);
}

export async function makeToken(userId, name) {
  const payload = b64url(userId + '.' + name);
  const sig = b64url(await sha256Hex(payload + '.' + SECRET));
  return payload + '.' + sig;
}

export async function verifyToken(token) {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 2) return null;
  const sig = b64url(await sha256Hex(parts[0] + '.' + SECRET));
  if (sig !== parts[1]) return null;
  try {
    const p = b64urlDecode(parts[0]).split('.');
    return { id: parseInt(p[0], 10), name: p[1] };
  } catch (e) { return null; }
}

export function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
