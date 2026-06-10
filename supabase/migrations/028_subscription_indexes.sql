-- ================================================================
-- EcoWise: Subscriptions uniqueness + perf indexes
-- Migration: 028_subscription_indexes
-- ================================================================
--
-- Two improvements on `"Subscriptions"`:
--
-- 1. Partial UNIQUE index on (subject_type, subject_id) WHERE status
--    IN ('Trial', 'Active', 'PastDue').
--
--    `subscribeToPlan` was rewritten in REVIEW.md high #C10 to insert
--    the new subscription BEFORE cancelling the old one (so a failed
--    cancel never leaves the subject with zero active subs). That
--    rewrite trades one race for a mild one — two active subs can
--    briefly coexist. This partial unique index makes that "briefly"
--    structurally impossible: the second insert hits 23505 and the
--    application's existing 23505 handler short-circuits without
--    duplicating state.
--
-- 2. Composite index on (subject_type, subject_id, status).
--
--    Every page load that resolves "the current subscription" runs
--    `WHERE subject_type=$1 AND subject_id=$2 AND status IN (...)`.
--    Migration 015 added a `(status, current_period_end)` index for
--    the lifecycle cron, but the read path was still doing a seq scan
--    on busier tenants.
--
-- Idempotent: CREATE INDEX IF NOT EXISTS / DO-blocks.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname  = 'subscriptions_one_active_per_subject_uidx'
  ) THEN
    CREATE UNIQUE INDEX subscriptions_one_active_per_subject_uidx
      ON public."Subscriptions" (subject_type, subject_id)
      WHERE status IN ('Trial', 'Active', 'PastDue');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS subscriptions_subject_status_idx
  ON public."Subscriptions" (subject_type, subject_id, status);

COMMENT ON INDEX public.subscriptions_one_active_per_subject_uidx IS
  'Hard guarantee: at most one Trial/Active/PastDue subscription per subject. Catches concurrent subscribe races that the app-level order swap merely narrows.';

-- 3. Atomic cancel-then-insert helper.
--
--    The partial unique index above means the C10 "insert new before
--    cancelling old" ordering is now impossible (the existing active
--    sub blocks the insert). We need the cancel + insert to happen
--    inside a single transaction so:
--      (a) the previous sub is always cancelled before the new one is
--          inserted (satisfies the unique index), and
--      (b) if the insert fails the cancel is rolled back, so the
--          subject is never left with zero active subs.
--
--    The function returns the row id of the new subscription; the app
--    re-fetches it through the existing path so types stay simple.

CREATE OR REPLACE FUNCTION public.subscribe_to_plan_atomic(
  p_subject_type TEXT,
  p_subject_id   UUID,
  p_plan_id      UUID,
  p_status       TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end   TIMESTAMPTZ,
  p_trial_end    TIMESTAMPTZ,
  p_billing_email TEXT,
  p_billing_company TEXT,
  p_billing_address TEXT,
  p_billing_vat_id TEXT,
  p_created_by   UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Cancel any existing qualifying sub for this subject. Both the
  -- cancel and the insert below run in the same implicit transaction
  -- (postgres functions are atomic), so a failure on the insert rolls
  -- back the cancel too.
  UPDATE "Subscriptions"
     SET status = 'Canceled', canceled_at = NOW()
   WHERE subject_type = p_subject_type
     AND subject_id   = p_subject_id
     AND status IN ('Trial', 'Active', 'PastDue');

  INSERT INTO "Subscriptions" (
    subject_type, subject_id, plan_id, status,
    current_period_start, current_period_end, trial_end,
    auto_renew,
    billing_email, billing_company_name, billing_address, billing_vat_id,
    created_by
  ) VALUES (
    p_subject_type, p_subject_id, p_plan_id, p_status,
    p_period_start, p_period_end, p_trial_end,
    true,
    p_billing_email, p_billing_company, p_billing_address, p_billing_vat_id,
    p_created_by
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.subscribe_to_plan_atomic(
  TEXT, UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ,
  TEXT, TEXT, TEXT, TEXT, UUID
) TO service_role;
