ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS spotify_position SMALLINT NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS youtube_position SMALLINT NOT NULL DEFAULT 7;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS valid_spotify_position,
  DROP CONSTRAINT IF EXISTS valid_youtube_position;

ALTER TABLE profiles
  ADD CONSTRAINT valid_spotify_position CHECK (spotify_position BETWEEN 0 AND 7),
  ADD CONSTRAINT valid_youtube_position CHECK (youtube_position BETWEEN 0 AND 7);
