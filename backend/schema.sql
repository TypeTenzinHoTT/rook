CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  github_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  github_token TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_stats (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_active TIMESTAMP DEFAULT NOW(),
  achievements JSONB DEFAULT '[]',
  guild_id INTEGER
);

CREATE TABLE daily_quests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'daily',
  xp_reward INTEGER DEFAULT 100,
  completed BOOLEAN DEFAULT false,
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER DEFAULT 1,
  created_at DATE DEFAULT CURRENT_DATE,
  deadline TIMESTAMP
);

CREATE TABLE xp_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount INTEGER NOT NULL,
  reason VARCHAR(255),
  activity_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE friendships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  friend_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  rarity VARCHAR(50) DEFAULT 'common',
  condition JSONB
);

CREATE TABLE user_achievements (
  user_id INTEGER REFERENCES users(id),
  achievement_id INTEGER REFERENCES achievements(id),
  unlocked_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX idx_user_stats_xp ON user_stats(total_xp DESC);
CREATE INDEX idx_xp_activity_user ON xp_activity(user_id, created_at DESC);
CREATE INDEX idx_friendships_user ON friendships(user_id);
