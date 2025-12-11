-- APPLY THIS MIGRATION MANUALLY BEFORE DEPLOYING:
-- psql "postgresql://postgres.vrjjfmwelgexgsalhrwa:Laminar%4002@aws-1-us-east-1.pooler.supabase.com:5432/postgres" -f backend/migrations/002_crafting.sql

CREATE TABLE IF NOT EXISTS crafting_recipes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  result_item_id INTEGER REFERENCES loot_items(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crafting_recipe_ingredients (
  recipe_id INTEGER REFERENCES crafting_recipes(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES loot_items(id),
  quantity INTEGER NOT NULL,
  PRIMARY KEY (recipe_id, item_id)
);
