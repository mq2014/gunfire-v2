# 安全说明（部署前必读）

本仓库为**公开的作品展示仓库**，为忠实还原开发状态，服务端代码按原样保留。以下两处凭据因此是公开的：

| 位置 | 内容 | 风险 |
|---|---|---|
| `functions/api/_auth.js` | `export const SECRET = 'gunfire-v2-static-secret-v1'` | 登录 token 使用「载荷.HMAC」无状态签名，SECRET 泄露意味着任何人都能伪造任意用户的 token |
| `functions/api/ban.js` | 后台密码 `ADMIN_PASS`：优先读环境变量 `GF_ADMIN_PASS`，否则回落为硬编码默认值 `asdfghjkl` | 默认部署下任何人可调用封禁 / 解封接口 |
| `functions/api/stats.js`、`stats-users.js` | 注释明确写着「公开接口：门禁由前端密码承担，无需登录 token」 | **不需要任何凭据**即可读取全站统计与全部注册账号名单，属于信息泄露 |
| `index.html` 前端 | 后台面板内同样写有该默认密码 | 前端门禁不构成安全边界 |

此外 `schema.sql` 中的账号密码采用 SHA-256 + 随机盐存储，属于演示级实现，未做慢哈希（Argon2/bcrypt）。

## 若要正式部署

1. 把 `SECRET` 改为从 `env.GUNFIRE_SECRET` 注入，并在 Cloudflare Pages 后台设置为 Secret，不要写进代码；
2. 设置 `GF_ADMIN_PASS` 环境变量覆盖默认后台密码，并删除代码里的回落默认值；
3. 为 `stats` / `stats-users` / `ban` / `blacklist` 增加服务端鉴权（校验 token 中的管理员标记），不能依赖前端密码；
4. 密码哈希换成 bcrypt / Argon2 或接入正式身份服务（可参考本项目之外的 `mq2014/langu`，它用 PBKDF2-SHA256 10 万次 + 随机盐）；
5. 对管理接口增加速率限制；
6. 若线上已使用过同一 SECRET，视为已泄露，需要使所有已签发 token 失效。

> 注意：即使后续从本仓库删除这些值，Git 历史与公开仓库的缓存/镜像仍可检索到，**唯一有效处置是轮换**。
