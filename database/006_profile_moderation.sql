ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(500);

CREATE TABLE IF NOT EXISTS profile_reports (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_email TEXT,
  reason VARCHAR(30) NOT NULL,
  details VARCHAR(1000) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_note VARCHAR(1000) NOT NULL DEFAULT '',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_profile_report_reason CHECK (
    reason IN ('impersonation', 'fraud', 'illegal', 'harassment', 'spam', 'other')
  ),
  CONSTRAINT valid_profile_report_status CHECK (
    status IN ('pending', 'reviewed', 'dismissed', 'actioned')
  )
);

CREATE INDEX IF NOT EXISTS profile_reports_status_created_idx
  ON profile_reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS profile_reports_profile_created_idx
  ON profile_reports(profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS profile_moderation_actions (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES profile_reports(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL,
  note VARCHAR(1000) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_profile_moderation_action CHECK (
    action IN ('review', 'dismiss', 'suspend', 'restore')
  )
);

CREATE INDEX IF NOT EXISTS profile_moderation_actions_report_created_idx
  ON profile_moderation_actions(report_id, created_at DESC);

CREATE INDEX IF NOT EXISTS profiles_suspended_at_idx
  ON profiles(suspended_at)
  WHERE suspended_at IS NOT NULL;
