CREATE TABLE IF NOT EXISTS loot_items (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT,
  rarity TEXT CHECK (rarity IN ('common','rare','epic','legendary')),
  drop_weight INTEGER NOT NULL,
  description TEXT,
  ascii_icon TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loot_drops (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  item_id INTEGER REFERENCES loot_items(id),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, item_id)
);
