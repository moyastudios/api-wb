-- Run once in Vercel: Storage > your database > Database > Query.
CREATE TABLE IF NOT EXISTS player_data (
  user_id    BIGINT PRIMARY KEY,
  data       JSONB NOT NULL,
  saved_at   TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_data (
  key        TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  saved_at   TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_logs (
  id          BIGSERIAL PRIMARY KEY,
  category    TEXT NOT NULL,
  actor_id    BIGINT,
  target_id   BIGINT,
  data        JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_logs_category_time ON game_logs (category, occurred_at DESC);
CREATE INDEX IF NOT EXISTS game_logs_target ON game_logs (target_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS game_logs_actor ON game_logs (actor_id, occurred_at DESC);
