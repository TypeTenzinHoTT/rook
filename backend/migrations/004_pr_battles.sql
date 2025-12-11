CREATE TABLE IF NOT EXISTS pr_battles (
  id SERIAL PRIMARY KEY,
  status TEXT DEFAULT 'pending',
  winner_user_id INT REFERENCES users(id),
  repo TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pr_battle_participants (
  battle_id INT REFERENCES pr_battles(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  pr_id TEXT,
  pr_number INTEGER,
  pr_url TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (battle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pr_battles_status ON pr_battles(status);
CREATE INDEX IF NOT EXISTS idx_pr_battle_pr ON pr_battle_participants(pr_id);
