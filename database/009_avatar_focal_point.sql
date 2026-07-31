ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_position_x SMALLINT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_position_y SMALLINT NOT NULL DEFAULT 20;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS valid_avatar_position_x,
  DROP CONSTRAINT IF EXISTS valid_avatar_position_y;

ALTER TABLE profiles
  ADD CONSTRAINT valid_avatar_position_x CHECK (avatar_position_x BETWEEN 0 AND 100),
  ADD CONSTRAINT valid_avatar_position_y CHECK (avatar_position_y BETWEEN 0 AND 100);
