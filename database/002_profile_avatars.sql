CREATE TABLE IF NOT EXISTS profile_avatars (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL,
  content BYTEA NOT NULL,
  etag CHAR(64) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_avatar_content_type
    CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp'))
);
