ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_email TEXT;

-- Accounts created before email verification existed remain valid.
UPDATE users
SET email_verified_at = NOW()
WHERE email_verified_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_pending_email_unique_idx
  ON users (pending_email)
  WHERE pending_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS account_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(30) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_account_token_purpose CHECK (
    purpose IN ('verify_email', 'verify_email_change', 'reset_password')
  )
);

CREATE INDEX IF NOT EXISTS account_tokens_user_purpose_idx
  ON account_tokens(user_id, purpose);

CREATE INDEX IF NOT EXISTS account_tokens_expires_at_idx
  ON account_tokens(expires_at);
