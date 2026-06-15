-- ================================================================
-- EcoWise: cast text params to enums in subscribe_to_plan_atomic
-- Migration: 037_fix_subscribe_atomic_enum_cast
--
--   The function (migration 028) declares p_subject_type / p_status as TEXT
--   but compares/inserts them against the `subscription_subject_type` and
--   `subscription_status` enum columns. Postgres has no implicit text→enum
--   cast, so the body raised:
--       operator does not exist: subscription_subject_type = text
--   whenever it ran (admin plan-upgrade approval, free-plan subscribe).
--
--   Recreate the function with explicit ::enum casts. Signature, security,
--   and grants are unchanged. Idempotent.
-- ================================================================

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
  UPDATE "Subscriptions"
     SET status = 'Canceled', canceled_at = NOW()
   WHERE subject_type = p_subject_type::subscription_subject_type
     AND subject_id   = p_subject_id
     AND status IN ('Trial', 'Active', 'PastDue');

  INSERT INTO "Subscriptions" (
    subject_type, subject_id, plan_id, status,
    current_period_start, current_period_end, trial_end,
    auto_renew,
    billing_email, billing_company_name, billing_address, billing_vat_id,
    created_by
  ) VALUES (
    p_subject_type::subscription_subject_type, p_subject_id, p_plan_id,
    p_status::subscription_status,
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
