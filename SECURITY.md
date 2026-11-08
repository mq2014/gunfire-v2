# 安全说明（部署前必读）

本仓库为**公开的作品展示仓库**，为忠实还原开发状态，服务端代码按原样保留。以下两处凭据因此是公开的：

| 位置 | 内容 | 风险 |
|---|---|---|
| `functions/api/_auth.js` | `export const SECRET = 'gunfire-v2-static-secret-v1'` | 登录 token 使用「载荷.HMAC」无状态签名，SECRET 泄露意味着任何人都能伪造任意用户的 token |
| `functions/api/ban.js`、`blacklist.js` 等 | 后台管理密码 `asdfghjkl`（硬编码在注释与校验逻辑中） | 任何人可调用封禁/黑名单接口 |

此外 `schema.sql` 中的账号密码采用 SHA-256 + 随机盐存储，属于演示级实现，未做慢哈希（Argon2/bcrypt）。

## 若要正式部署

1. 把 `SECRET` 改为从环境变量注入（`env.GUNFIRE_SECRET`），并在 Cloudflare Pages 后台设置为 Secret，不要写进代码；
2. 轮换后台管理密码，同样改为环境变量；
3. 密码哈希换成 bcrypt / Argon2 或接入正式身份服务；
4. 对 `ban` / `stats-users` 等管理接口增加独立鉴权与速率限制；
5. 若线上已使用过同一 SECRET，视为已泄露，需要使所有已签发 token 失效。

> 注意：即使后续从本仓库删除这些值，Git 历史与公开仓库的缓存/镜像仍可检索到，**唯一有效处置是轮换**。
