CREATE TABLE IF NOT EXISTS rate_limits (
  key_hash CHAR(64) PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limits_expires_at_idx
  ON rate_limits(expires_at);
