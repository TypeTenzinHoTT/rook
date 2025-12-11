CREATE TABLE IF NOT EXISTS notification_integrations (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  type TEXT NOT NULL, -- slack or discord
  webhook_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_integrations_user ON notification_integrations(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_integrations_user_type ON notification_integrations(user_id, type);
