# 枪林弹雨 V2

一款网页射击对战游戏。前端是单文件 `index.html`，后端用 Cloudflare Pages Functions + D1 数据库提供账号、好友、在线状态与决斗邀请等真实联网能力。

> 作品仍在迭代中，仓库随开发进度同步。

## 玩法与系统

- **战役 / 竞技场**：主界面以「战役」为入口，含竞技场、任务等模块
- **军械与背包**：`gunimg/` 内置 7 类武器图（手枪、步枪、冲锋枪、狙击枪、霰弹枪、机枪、火箭筒），配合背包与商城
- **好友系统**：账号查找、发送/接受/拒绝好友申请、好友列表
- **决斗系统**：邀请、接受、拒绝、认输、观战、逐帧 tick，邀请状态落库
- **在线状态**：`presence` 表 + 接口记录在线情况
- **统计与后台**：全站/用户统计、封禁与黑名单

## 目录结构

```
index.html              游戏主体（单文件，内联 CSS/JS）
functions/api/          Cloudflare Pages Functions，21 个接口
  _auth.js              共享鉴权：SHA-256 加盐密码 + 无状态签名 token
  login.js / register.js / profile.js / logout.js / me.js
  friends*.js / friend-*.js        好友
  duel-*.js                        决斗
  presence.js / stats*.js / users-lookup.js
  ban.js / blacklist.js            后台管理
schema.sql              D1 建表脚本（users / friends / presence / duel_invites / duel_rooms）
gunimg/                 武器图片资源
versions/               历史版本快照与回滚脚本
wrangler.toml           Cloudflare Pages 配置（含 D1 绑定）
```

## 本地运行

前端零构建，直接双击 `index.html` 即可打开。但**账号、好友、决斗需要后端**：

```bash
# 需要 Wrangler 与 Cloudflare 账号
wrangler d1 execute gunfire-db --file=schema.sql
wrangler pages dev .
```

`wrangler.toml` 里已配置 Pages 项目名 `gunfire-v2` 与 D1 绑定 `DB`。

## 技术栈

原生 HTML / CSS / JavaScript（无前端框架）+ Cloudflare Pages Functions + D1(SQLite) + Web Crypto API。

## 迭代记录

2026-09-06 立项，到 10-11 期间经过多轮迭代：从纯前端玩法原型，逐步补上真实账号体系、D1 数据库、好友与决斗后端、竞技场与军械库、封禁与统计后台。`versions/` 保留了早期快照。

## 安全说明

见 [SECURITY.md](SECURITY.md)。本项目为演示作品，服务端含硬编码凭据，**请勿直接用于生产部署**。
