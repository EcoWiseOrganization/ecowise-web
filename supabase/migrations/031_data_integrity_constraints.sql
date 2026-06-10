-- ─────────────────────────────────────────────────────────────────────────
-- Migration 031 — data-integrity backstops
--
-- Two CHECK / trigger additions that close gaps left by app-layer
-- enforcement. They're cheap belt-and-braces — the app already
-- shouldn't drift these columns, but a one-line DB rule catches
-- bugs the test suite missed.
--
--   (1) Subscriptions.retry_count >= 0
--       BR-10 retry logic increments `retry_count`. A direct SQL
--       update or a botched lifecycle path could leave the column
--       negative; the lifecycle code treats negative as "below
--       threshold" forever, so a customer would never be
--       force-terminated.
--
--   (2) Rewards SoldOut trigger
--       The redeem RPC (migration 030) flips status correctly on
--       decrement, but a manual UPDATE that drops `total_stock` to
--       0 without touching `status` would leave the row visible as
--       "Active" in the catalog while every redeem fails. A BEFORE
--       UPDATE trigger snaps the status whenever the new
--       `total_stock` crosses one of the thresholds.
-- ─────────────────────────────────────────────────────────────────────────

-- (1) retry_count guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'subscriptions_retry_count_nonneg'
  ) THEN
    ALTER TABLE "Subscriptions"
      ADD CONSTRAINT subscriptions_retry_count_nonneg
      CHECK (retry_count >= 0);
  END IF;
END
$$;

-- (2) Rewards stock-status sync trigger.
CREATE OR REPLACE FUNCTION public.sync_reward_status_from_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Admin-managed `Inactive` stays put — the trigger only resyncs the
  -- "available for redemption" tri-state (Active / LowStock / SoldOut)
  -- so we don't accidentally re-publish a reward an admin retired.
  IF NEW.status IN ('Active'::reward_status, 'LowStock'::reward_status, 'SoldOut'::reward_status) THEN
    IF NEW.total_stock <= 0 THEN
      NEW.status := 'SoldOut'::reward_status;
    ELSIF NEW.total_stock < 5 THEN
      NEW.status := 'LowStock'::reward_status;
    ELSE
      -- Only un-set LowStock / SoldOut on restock; keep Active as Active.
      IF NEW.status IN ('LowStock'::reward_status, 'SoldOut'::reward_status) THEN
        NEW.status := 'Active'::reward_status;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rewards_sync_status ON "Rewards";
CREATE TRIGGER trg_rewards_sync_status
  BEFORE INSERT OR UPDATE OF total_stock ON "Rewards"
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reward_status_from_stock();

-- One-shot reconciliation: any row left visible as 'Active' / 'LowStock'
-- with stock = 0 from before the trigger existed.
UPDATE "Rewards"
   SET status = 'SoldOut'::reward_status
 WHERE total_stock <= 0
   AND status IN ('Active'::reward_status, 'LowStock'::reward_status);
