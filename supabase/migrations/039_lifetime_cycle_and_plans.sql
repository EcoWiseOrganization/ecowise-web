-- ================================================================
-- EcoWise: Lifetime billing cycle + Annual / Lifetime VND plans
-- Migration: 039_lifetime_cycle_and_plans
--
--   • Add a 'Lifetime' billing cycle ("trọn đời").
--   • Seed two B2C VND plans used by the yearly / lifetime demo
--     subscriptions: Eco-Chuyên Nghiệp (Năm) and Eco-Trọn Đời.
--
--   Idempotent. The new enum value is committed before use via -- @SPLIT.
-- ================================================================

ALTER TYPE subscription_billing_cycle ADD VALUE IF NOT EXISTS 'Lifetime';

-- @SPLIT

INSERT INTO "SubscriptionPlans" (
  plan_code, plan_name, target_customer, base_price_usd, billing_cycle,
  trial_days, max_users, max_events, features, status
)
VALUES
  (
    'ECO_PRO_ANNUAL', 'Eco-Chuyên Nghiệp (Năm)', 'B2C', 70000000, 'Annual',
    0, 500, 500,
    '[
      {"key":"bulk_import","label":"Tải dữ liệu hàng loạt (Excel/CSV)"},
      {"key":"transport_tracking","label":"Theo dõi phát thải di chuyển"},
      {"key":"realtime_dashboard","label":"Bảng điều khiển thời gian thực (<500n)"},
      {"key":"esg_reports","label":"Báo cáo xuất ESG tiêu chuẩn"},
      {"key":"annual_saving","label":"Tiết kiệm hơn so với trả theo quý"}
    ]'::jsonb,
    'Active'
  ),
  (
    'ECO_LIFETIME', 'Eco-Trọn Đời', 'B2C', 150000000, 'Lifetime',
    0, NULL, NULL,
    '[
      {"key":"all_pro","label":"Toàn bộ tính năng gói Chuyên Nghiệp"},
      {"key":"lifetime_access","label":"Sử dụng trọn đời, không cần gia hạn"},
      {"key":"priority_support","label":"Hỗ trợ ưu tiên"},
      {"key":"free_updates","label":"Cập nhật tính năng miễn phí"}
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
