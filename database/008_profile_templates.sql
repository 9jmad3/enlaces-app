ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS valid_template;

ALTER TABLE profiles
  ADD CONSTRAINT valid_template
  CHECK (template_id IN ('studio', 'pulse', 'aura', 'frame'));
