CREATE TABLE IF NOT EXISTS guilds (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_members (
  guild_id INT REFERENCES guilds(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) UNIQUE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS guild_invites (
  id SERIAL PRIMARY KEY,
  guild_id INT REFERENCES guilds(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  invited_by INT REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_quests (
  id SERIAL PRIMARY KEY,
  guild_id INT REFERENCES guilds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INT DEFAULT 0,
  progress_current INT DEFAULT 0,
  progress_total INT DEFAULT 1,
  refresh_at TIMESTAMPTZ DEFAULT date_trunc('week', NOW())
);

CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);
