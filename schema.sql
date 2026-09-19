CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 email TEXT UNIQUE,
 name TEXT NOT NULL,
 plan TEXT NOT NULL DEFAULT 'free',
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS benchmark_runs (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 behavior_id TEXT NOT NULL,
 status TEXT NOT NULL,
 input_json TEXT NOT NULL,
 result_json TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_user ON benchmark_runs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_runs_behavior ON benchmark_runs(behavior_id, created_at);
