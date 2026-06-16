-- ================================================================
-- EcoWise: individual-only catalog (no business plans sold)
-- Migration: 040_individual_only_catalog
--
--   The platform now sells only personal (B2C) plans. Seed the two priced
--   individual plans shown on the landing page — Eco-Cá Nhân (Năm) at
--   189,000 VND/năm and Eco-Cá Nhân Trọn Đời at 499,000 VND — and retire
--   every business plan plus the older business-styled B2C tiers.
--
--   Existing subscriptions on retired plans keep working; the data move to
--   the new plans is handled out-of-band. Idempotent.
-- ================================================================

INSERT INTO "SubscriptionPlans" (
  plan_code, plan_name, target_customer, base_price_usd, billing_cycle,
  trial_days, max_users, max_events, features, status
)
VALUES
  (
    'ECO_PERSONAL_ANNUAL', 'Eco-Cá Nhân (Năm)', 'B2C', 189000, 'Annual',
    0, 1, 0,
    '[
      {"key":"unlimited_logs","label":"Nhật ký phát thải cá nhân không giới hạn"},
      {"key":"advanced_analytics","label":"Phân tích & thống kê nâng cao"},
      {"key":"recommendations","label":"Gợi ý giảm phát thải cá nhân hóa"},
      {"key":"report_export","label":"Lịch sử đầy đủ & xuất báo cáo"}
    ]'::jsonb,
    'Active'
  ),
  (
    'ECO_PERSONAL_LIFETIME', 'Eco-Cá Nhân Trọn Đời', 'B2C', 499000, 'Lifetime',
    0, 1, 0,
    '[
      {"key":"all_annual","label":"Bao gồm toàn bộ gói theo năm"},
      {"key":"advanced_analytics","label":"Phân tích & thống kê nâng cao"},
      {"key":"recommendations","label":"Gợi ý giảm phát thải cá nhân hóa"},
      {"key":"priority_support","label":"Hỗ trợ ưu tiên & cập nhật miễn phí"}
    ]'::jsonb,
    'Active'
  )
ON CONFLICT (plan_code) DO UPDATE
   SET plan_name       = EXCLUDED.plan_name,
       target_customer = EXCLUDED.target_customer,
       base_price_usd  = EXCLUDED.base_price_usd,
       billing_cycle   = EXCLUDED.billing_cycle,
       trial_days      = EXCLUDED.trial_days,
       max_users       = EXCLUDED.max_users,
       max_events      = EXCLUDED.max_events,
       features        = EXCLUDED.features,
       status          = 'Active';

-- Retire every business plan + the older business-styled B2C tiers. Only the
-- free + the two new personal plans remain purchasable.
UPDATE "SubscriptionPlans"
   SET status = 'Inactive'
 WHERE plan_code NOT IN (
   'ECO_PERSONAL_FREE', 'ECO_PERSONAL_ANNUAL', 'ECO_PERSONAL_LIFETIME'
 );
