-- ================================================================
-- EcoWise: Performance hardening (Phase 11)
-- Migration: 015_perf_indexes
--   Additive-only — safe to re-run, no data changes.
-- ================================================================

-- EmissionLogs: lookups by creator + by org+status (review queue).
CREATE INDEX IF NOT EXISTS idx_emission_logs_created_by  ON "EmissionLogs" (created_by);
CREATE INDEX IF NOT EXISTS idx_emission_logs_org_status  ON "EmissionLogs" (org_id, status);

-- AuditLogs: filter by org_id + created_at (Phase 10 detail page) and per
-- actor history.
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created    ON "AuditLogs" (org_id, created_at DESC);

-- ContactMessages: status filter on landing of Phase 10 page.
CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created
  ON "ContactMessages" (status, created_at DESC);

-- Subscriptions: lifecycle scan filters status + period_end.
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_period_end
  ON "Subscriptions" (status, current_period_end);

-- Invoices: monthly revenue aggregate (Phase 10 platform metrics).
CREATE INDEX IF NOT EXISTS idx_invoices_status_paid_at
  ON "Invoices" (status, paid_at DESC);

-- GreenPointLogs leaderboard scan.
CREATE INDEX IF NOT EXISTS idx_green_point_logs_action_created
  ON "GreenPointLogs" (action, created_at DESC);

-- Challenges: dashboard lookups.
CREATE INDEX IF NOT EXISTS idx_challenges_org_status
  ON "Challenges" (org_id, status);

-- Rewards: catalog filter.
CREATE INDEX IF NOT EXISTS idx_rewards_status_cost
  ON "Rewards" (status, points_cost);

-- Redemptions: user history.
CREATE INDEX IF NOT EXISTS idx_redemptions_user_created
  ON "Redemptions" (user_id, created_at DESC);
