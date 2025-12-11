-- Quests table for tracking daily and weekly quest progress
CREATE TABLE IF NOT EXISTS quests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quest_type VARCHAR(50) NOT NULL, -- 'daily' or 'weekly'
  progress_target INTEGER NOT NULL DEFAULT 1,
  progress_current INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, title, quest_type, expires_at)
);

CREATE INDEX IF NOT EXISTS idx_quests_user_type ON quests(user_id, quest_type);
CREATE INDEX IF NOT EXISTS idx_quests_expires ON quests(expires_at);
