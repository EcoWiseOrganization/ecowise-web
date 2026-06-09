-- ================================================================
-- EcoWise: invoice idempotency for cron / parallel lifecycle ticks
-- Migration: 025_invoice_idempotency
-- ================================================================
--
-- Without this constraint, two concurrent invocations of the billing
-- cron (Vercel retry, manual curl, scheduler race) both compute the
-- same `newEnd` for a subscription's next renewal and both insert
-- "renewal" invoices — the user gets double-billed and a duplicate
-- PaymentIntent is queued.
--
-- One renewal per (subscription, period). `due_date` is the next
-- period_end the lifecycle service writes, so identical concurrent
-- runs collide on the same value here.
--
-- The constraint is full-table (no partial) so cancelled/refunded
-- attempts for the same period also can't be silently re-issued —
-- callers must change reason or period to retry.
--
-- Idempotent: safe to re-run.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'invoices_dedup_per_period_unique'
  ) THEN
    ALTER TABLE public."Invoices"
      ADD CONSTRAINT invoices_dedup_per_period_unique
      UNIQUE (subscription_id, billing_reason, due_date);
  END IF;
END $$;

COMMENT ON CONSTRAINT invoices_dedup_per_period_unique
  ON public."Invoices" IS
  'Cron + lifecycle idempotency: one invoice per (subscription, billing_reason, due_date). Concurrent renewals collide here; the loser short-circuits the duplicate work.';
