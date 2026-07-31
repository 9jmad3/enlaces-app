ALTER TABLE profile_reports
  ADD COLUMN IF NOT EXISTS public_reason VARCHAR(1000) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ;

ALTER TABLE profile_moderation_actions
  ADD COLUMN IF NOT EXISTS public_reason VARCHAR(1000) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reporter_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reporter_notification_error VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS owner_notification_error VARCHAR(1000);
