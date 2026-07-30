CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(30) NOT NULL UNIQUE,
  display_name VARCHAR(60) NOT NULL,
  tagline VARCHAR(100) NOT NULL DEFAULT '',
  bio VARCHAR(280) NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  template_id VARCHAR(20) NOT NULL DEFAULT 'studio',
  background_color CHAR(7) NOT NULL DEFAULT '#F3EFE7',
  accent_color CHAR(7) NOT NULL DEFAULT '#E65336',
  text_color CHAR(7) NOT NULL DEFAULT '#18201D',
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_template CHECK (template_id IN ('studio', 'pulse'))
);

CREATE TABLE IF NOT EXISTS profile_links (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(60) NOT NULL,
  url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  position SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profile_links_profile_position_idx
  ON profile_links(profile_id, position);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
