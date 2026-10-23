CREATE TABLE IF NOT EXISTS engage_profiles (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);
