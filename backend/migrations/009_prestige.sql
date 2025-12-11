CREATE TABLE IF NOT EXISTS prestige_resets (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  level_reset_at INT,
  perks JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prestige_user ON prestige_resets(user_id);
