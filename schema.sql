CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  account       TEXT    NOT NULL,
  pw_hash       TEXT    NOT NULL,
  salt          TEXT    NOT NULL,
  created_at    INTEGER NOT NULL,
  logged_in_at  INTEGER,                 -- 最近一次成功登录时间戳（用于统计「登录过」人数）；NULL=从未登录
  ever_played   INTEGER NOT NULL DEFAULT 0, -- 是否曾进入对局（上报 playing 后置 1）
  banned        INTEGER NOT NULL DEFAULT 0  -- 是否被后台封禁：1=封禁（登录时直接 禁止登录），0=正常
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_lower ON users(lower(name));

-- 好友关系：仅存在于“真实注册用户”之间。status: pending(待接受) | accepted(已成为好友)
CREATE TABLE IF NOT EXISTS friends (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  friend_id   INTEGER NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'pending',
  created_at  INTEGER NOT NULL,
  UNIQUE(user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);

-- 在线状态（真实）：由客户端心跳上报，服务端只存真值，绝不模拟
-- status: open=已开启游戏(在大厅/菜单) | playing=正在对局 | offline=已关闭
CREATE TABLE IF NOT EXISTS presence (
  user_id     INTEGER PRIMARY KEY,
  online      INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'open',
  updated_at  INTEGER NOT NULL
);

-- 1V1 对战邀请：仅真实注册好友之间。status: pending(待对方同意) | accepted | declined
CREATE TABLE IF NOT EXISTS duel_invites (
  id           TEXT    PRIMARY KEY,
  from_account TEXT    NOT NULL,   -- 发起人账号
  from_name    TEXT    NOT NULL,
  to_account   TEXT    NOT NULL,   -- 被邀请人账号（必须是好友且在线）
  to_name      TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'pending',
  room_id      TEXT,
  seed         INTEGER,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_duel_invites_to   ON duel_invites(to_account, status);
CREATE INDEX IF NOT EXISTS idx_duel_invites_from ON duel_invites(from_account, status);

-- 1V1 对战房间：双方实时快照 + 子弹事件都存这里（D1 轮询同步，非模拟）
CREATE TABLE IF NOT EXISTS duel_rooms (
  room_id       TEXT    PRIMARY KEY,
  status        TEXT    NOT NULL DEFAULT 'waiting',  -- waiting | playing | finished
  seed          INTEGER,
  host_account  TEXT,
  guest_account TEXT,
  host_snap     TEXT    NOT NULL DEFAULT '{}',
  guest_snap    TEXT    NOT NULL DEFAULT '{}',
  host_bullets  TEXT    NOT NULL DEFAULT '[]',        -- 房主外发子弹事件（含唯一 id）
  guest_bullets TEXT    NOT NULL DEFAULT '[]',        -- 客方外发子弹事件
  host_score    INTEGER NOT NULL DEFAULT 0,
  guest_score   INTEGER NOT NULL DEFAULT 0,
  phase         TEXT    NOT NULL DEFAULT 'fight',     -- fight | respawn
  phase_until   INTEGER NOT NULL DEFAULT 0,          -- respawn 结束时间戳
  round_closed  INTEGER NOT NULL DEFAULT 0,          -- 本回合是否已结算（防重复计分）
  winner        TEXT    NOT NULL DEFAULT '',          -- host | guest | ''
  updated_at    INTEGER NOT NULL
);

