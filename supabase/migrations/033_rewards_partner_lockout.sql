-- ─────────────────────────────────────────────────────────────────────────
-- Migration 033 — temporary lockout + remove partner-branded rewards
--
-- EcoWise doesn't have brand partnerships in place yet, so the
-- partner-only voucher / donation rewards seeded in 014 and 019
-- (Grab, Co.opmart, AnNam Gourmet, The Workshop, Là Việt, Gaia
-- Nature Reserve) shouldn't be redeemable from the catalog.
-- Marking them Inactive (rather than deleting) keeps any historical
-- Redemption rows valid — the row's FK still resolves.
--
-- Separately, the remaining EcoWise-branded rewards get their
-- points_cost bumped to a prohibitive value so nobody can redeem
-- them while the redemption flow is still under review. The intent
-- is "temporarily disabled" — drop the cost back to a real number
-- when the flow is signed off.
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Soft-disable partner-branded rewards ────────────────────────────
UPDATE "Rewards"
SET status     = 'Inactive',
    updated_at = now()
WHERE sku IN (
  'VOUCHER-50K',        -- Co.opmart / AnNam Gourmet
  'VOUCHER-COFFEE',     -- The Workshop / Là Việt
  'DONATE-5-TREES',     -- Gaia Nature Reserve
  'DONATE-20-TREES',    -- Gaia Nature Reserve
  'VOUCHER-GRAB-20K',   -- Grab
  'TREE-1'              -- legacy generic tree-planting partner (from 014)
);

-- ── 2. Lock the remaining catalog behind an unreachable price ──────────
--
-- 9 999 999 pts is well above what any user can accumulate this
-- season. We only touch rows that are still in the catalog (status =
-- Active / LowStock) so the partner rows we just soft-disabled stay
-- at their original cost (purely cosmetic — they're hidden anyway).
UPDATE "Rewards"
SET points_cost = 9999999,
    updated_at  = now()
WHERE status IN ('Active', 'LowStock')
  AND points_cost < 9999999;

COMMIT;
