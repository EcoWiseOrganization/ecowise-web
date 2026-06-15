-- ================================================================
-- EcoWise: B2B mirror of the Eco-* VND plans
-- Migration: 036_vnd_catalog_b2b
--
--   Migration 035 seeded the VND catalog as B2C only, leaving org billing
--   (listPlans('B2B')) with no Active plans. Reuse Eco-Khởi Đầu / Eco-Chuyên
--   Nghiệp as B2B plans so organizations can subscribe via the same QR flow.
--
--   New plan_codes (the column is UNIQUE); same prices/cycle/features as the
--   B2C rows, with org-scoped quotas. Idempotent (ON CONFLICT refresh).
-- ================================================================

INSERT INTO "SubscriptionPlans" (
  plan_code, plan_name, target_customer, base_price_usd, billing_cycle,
  trial_days, max_users, max_events, features, status
)
VALUES
  (
    'ECO_STARTER_B2B', 'Eco-Khởi Đầu', 'B2B', 10000000, 'Quarterly',
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
    'ECO_PRO_B2B', 'Eco-Chuyên Nghiệp', 'B2B', 20000000, 'Quarterly',
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
