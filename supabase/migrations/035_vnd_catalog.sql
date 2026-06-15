-- ================================================================
-- EcoWise: VND catalog aligned with the public marketing pricing
-- Migration: 035_vnd_catalog
--
--   • Add a 'Quarterly' billing cycle (marketing leads with "/ Quý").
--   • Retire the original USD seed plans (set Inactive — existing
--     subscriptions keep their plan row; the picker only lists Active).
--   • Seed the three Eco-* B2C plans in VND, matching PricingSection.
--
--   NB: the `base_price_usd` column keeps its historical name but now
--   stores a VND amount for the new rows. The UI formats by the
--   plan/invoice currency (VND) so the column name is cosmetic.
--
--   Idempotent.
-- ================================================================

-- New enum value MUST be committed before it's referenced (Postgres 55P04).
-- The apply-migrations runner commits at the `-- @SPLIT` marker below.
ALTER TYPE subscription_billing_cycle ADD VALUE IF NOT EXISTS 'Quarterly';

-- @SPLIT

-- Retire every pre-existing plan so the billing picker only surfaces the
-- new VND catalog. Active subscriptions on these plans are unaffected
-- (getCurrentSubscription joins the plan row regardless of status).
UPDATE "SubscriptionPlans"
   SET status = 'Inactive'
 WHERE plan_code NOT IN ('ECO_PERSONAL_FREE', 'ECO_STARTER', 'ECO_PRO');

-- Seed the three marketing plans (B2C, VND). Re-runnable: prices/features
-- are refreshed on conflict so edits to this block propagate.
INSERT INTO "SubscriptionPlans" (
  plan_code, plan_name, target_customer, base_price_usd, billing_cycle,
  trial_days, max_users, max_events, features, status
)
VALUES
  (
    'ECO_PERSONAL_FREE', 'Eco-Cá Nhân Miễn Phí', 'B2C', 0, 'Monthly',
    0, 1, 0,
    '[
      {"key":"manual_logs","label":"Nhật ký phát thải thủ công"},
      {"key":"basic_transport","label":"Theo dõi di chuyển cơ bản"},
      {"key":"community_challenges","label":"Thử thách cộng đồng"},
      {"key":"leaderboard","label":"So sánh bảng xếp hạng"}
    ]'::jsonb,
    'Active'
  ),
  (
    'ECO_STARTER', 'Eco-Khởi Đầu', 'B2C', 10000000, 'Quarterly',
    0, 100, 100,
    '[
      {"key":"scope12","label":"Tính toán phát thải Phạm vi 1 & 2"},
      {"key":"vn_factors","label":"Hệ số phát thải Việt Nam"},
      {"key":"basic_dashboard","label":"Bảng điều khiển phát thải cơ bản"},
      {"key":"small_events","label":"Theo dõi sự kiện nhỏ (<100n)"}
    ]'::jsonb,
    'Active'
  ),
  (
    'ECO_PRO', 'Eco-Chuyên Nghiệp', 'B2C', 20000000, 'Quarterly',
    0, 500, 500,
    '[
      {"key":"bulk_import","label":"Tải dữ liệu hàng loạt (Excel/CSV)"},
      {"key":"transport_tracking","label":"Theo dõi phát thải di chuyển"},
      {"key":"realtime_dashboard","label":"Bảng điều khiển thời gian thực (<500n)"},
      {"key":"esg_reports","label":"Báo cáo xuất ESG tiêu chuẩn"}
    ]'::jsonb,
    'Active'
  )
ON CONFLICT (plan_code) DO UPDATE
   SET plan_name      = EXCLUDED.plan_name,
       target_customer = EXCLUDED.target_customer,
       base_price_usd  = EXCLUDED.base_price_usd,
       billing_cycle   = EXCLUDED.billing_cycle,
       trial_days      = EXCLUDED.trial_days,
       max_users       = EXCLUDED.max_users,
       max_events      = EXCLUDED.max_events,
       features        = EXCLUDED.features,
       status          = 'Active';
