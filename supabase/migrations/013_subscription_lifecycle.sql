-- ================================================================
-- EcoWise: Subscription lifecycle fields (Phase 8)
-- Migration: 013_subscription_lifecycle
--   • cancel_reason / cancel_feedback for UC-39
--   • last_renewal_attempt_at + last_renewal_error for cron telemetry
--   • trial_reminder_sent_at to dedupe reminder emails
-- ================================================================

ALTER TABLE "Subscriptions"
  ADD COLUMN IF NOT EXISTS cancel_reason            TEXT,
  ADD COLUMN IF NOT EXISTS cancel_feedback          TEXT,
  ADD COLUMN IF NOT EXISTS last_renewal_attempt_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_renewal_error       TEXT,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at   TIMESTAMPTZ;

COMMENT ON COLUMN "Subscriptions".cancel_reason          IS 'Reason picked by the user when cancelling (UC-39).';
COMMENT ON COLUMN "Subscriptions".cancel_feedback        IS 'Optional free-text feedback at cancel time.';
COMMENT ON COLUMN "Subscriptions".last_renewal_attempt_at IS 'Timestamp of the most recent renewal attempt by the lifecycle cron.';
COMMENT ON COLUMN "Subscriptions".last_renewal_error     IS 'Error message from the last failed renewal (BR-10).';
COMMENT ON COLUMN "Subscriptions".trial_reminder_sent_at IS 'Used to dedupe trial-ending email reminders.';
