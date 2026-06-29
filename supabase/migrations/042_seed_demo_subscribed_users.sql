-- ================================================================
-- EcoWise: Demo subscribed users for presentation
-- Migration: 042_seed_demo_subscribed_users
--
--   24/06/2026: Hương Giang (499k Trọn Đời), Minh Thư (189k Năm)
--   29/06/2026: Phương Anh (499k Trọn Đời), Hiền Diệu (189k Năm)
--
--   Idempotent: re-run safe (fixed UUIDs + ON CONFLICT guards).
--   Run manually in Supabase SQL Editor (service-role required for
--   auth.users writes).
-- ================================================================

DO $$
DECLARE
  -- Fixed UUIDs → idempotent
  uid_huong_giang  UUID := 'a1000001-0000-0000-0000-000000000001';
  uid_minh_thu     UUID := 'a1000002-0000-0000-0000-000000000002';
  uid_phuong_anh   UUID := 'a1000003-0000-0000-0000-000000000003';
  uid_hien_dieu    UUID := 'a1000004-0000-0000-0000-000000000004';

  sub_id_1  UUID := 'b1000001-0000-0000-0000-000000000001';
  sub_id_2  UUID := 'b1000002-0000-0000-0000-000000000002';
  sub_id_3  UUID := 'b1000003-0000-0000-0000-000000000003';
  sub_id_4  UUID := 'b1000004-0000-0000-0000-000000000004';

  plan_lifetime_id UUID;
  plan_annual_id   UUID;
BEGIN

  SELECT id INTO plan_lifetime_id FROM "SubscriptionPlans" WHERE plan_code = 'ECO_PERSONAL_LIFETIME';
  SELECT id INTO plan_annual_id   FROM "SubscriptionPlans" WHERE plan_code = 'ECO_PERSONAL_ANNUAL';

  IF plan_lifetime_id IS NULL OR plan_annual_id IS NULL THEN
    RAISE EXCEPTION 'Plans not found — ensure migration 040 has been applied.';
  END IF;

  -- ── 1. auth.users ────────────────────────────────────────────────
  INSERT INTO auth.users (
    id, aud, role, email,
    raw_user_meta_data, raw_app_meta_data,
    encrypted_password,
    email_confirmed_at, created_at, updated_at,
    is_super_admin, is_sso_user, is_anonymous
  ) VALUES
    (uid_huong_giang, 'authenticated', 'authenticated',
     'huong.giang@demo.ecowise.vn',
     '{"full_name":"Hương Giang"}'::jsonb,
     '{"provider":"email","providers":["email"]}'::jsonb,
     crypt('DemoSeed2026!', gen_salt('bf')),
     '2026-06-24 01:00:00Z', '2026-06-24 01:00:00Z', '2026-06-24 01:00:00Z',
     false, false, false),
    (uid_minh_thu, 'authenticated', 'authenticated',
     'minh.thu@demo.ecowise.vn',
     '{"full_name":"Minh Thư"}'::jsonb,
     '{"provider":"email","providers":["email"]}'::jsonb,
     crypt('DemoSeed2026!', gen_salt('bf')),
     '2026-06-24 02:00:00Z', '2026-06-24 02:00:00Z', '2026-06-24 02:00:00Z',
     false, false, false),
    (uid_phuong_anh, 'authenticated', 'authenticated',
     'phuong.anh@demo.ecowise.vn',
     '{"full_name":"Phương Anh"}'::jsonb,
     '{"provider":"email","providers":["email"]}'::jsonb,
     crypt('DemoSeed2026!', gen_salt('bf')),
     '2026-06-29 01:00:00Z', '2026-06-29 01:00:00Z', '2026-06-29 01:00:00Z',
     false, false, false),
    (uid_hien_dieu, 'authenticated', 'authenticated',
     'hien.dieu@demo.ecowise.vn',
     '{"full_name":"Hiền Diệu"}'::jsonb,
     '{"provider":"email","providers":["email"]}'::jsonb,
     crypt('DemoSeed2026!', gen_salt('bf')),
     '2026-06-29 02:00:00Z', '2026-06-29 02:00:00Z', '2026-06-29 02:00:00Z',
     false, false, false)
  ON CONFLICT (id) DO NOTHING;

  -- ── 2. "User" profile rows ───────────────────────────────────────
  -- (trigger on auth.users may already have created these; upsert is safe)
  INSERT INTO public."User" (id, email, full_name, is_admin, status, green_points, created_at)
  VALUES
    (uid_huong_giang, 'huong.giang@demo.ecowise.vn', 'Hương Giang', false, 'active', 0, '2026-06-24 01:00:00Z'),
    (uid_minh_thu,    'minh.thu@demo.ecowise.vn',    'Minh Thư',    false, 'active', 0, '2026-06-24 02:00:00Z'),
    (uid_phuong_anh,  'phuong.anh@demo.ecowise.vn',  'Phương Anh',  false, 'active', 0, '2026-06-29 01:00:00Z'),
    (uid_hien_dieu,   'hien.dieu@demo.ecowise.vn',   'Hiền Diệu',   false, 'active', 0, '2026-06-29 02:00:00Z')
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name;

  -- ── 3. Subscriptions ─────────────────────────────────────────────
  INSERT INTO public."Subscriptions" (
    id, subject_type, subject_id, plan_id,
    status, current_period_start, current_period_end,
    auto_renew, billing_email, created_at, updated_at
  ) VALUES
    -- Hương Giang — Eco-Cá Nhân Trọn Đời (499k), 24/06
    (sub_id_1, 'User', uid_huong_giang, plan_lifetime_id,
     'Active', '2026-06-24 01:00:00Z', '2099-01-01 00:00:00Z',
     false, 'huong.giang@demo.ecowise.vn',
     '2026-06-24 01:00:00Z', '2026-06-24 01:00:00Z'),
    -- Minh Thư — Eco-Cá Nhân (Năm) (189k), 24/06
    (sub_id_2, 'User', uid_minh_thu, plan_annual_id,
     'Active', '2026-06-24 02:00:00Z', '2027-06-24 02:00:00Z',
     true, 'minh.thu@demo.ecowise.vn',
     '2026-06-24 02:00:00Z', '2026-06-24 02:00:00Z'),
    -- Phương Anh — Eco-Cá Nhân Trọn Đời (499k), 29/06
    (sub_id_3, 'User', uid_phuong_anh, plan_lifetime_id,
     'Active', '2026-06-29 01:00:00Z', '2099-01-01 00:00:00Z',
     false, 'phuong.anh@demo.ecowise.vn',
     '2026-06-29 01:00:00Z', '2026-06-29 01:00:00Z'),
    -- Hiền Diệu — Eco-Cá Nhân (Năm) (189k), 29/06
    (sub_id_4, 'User', uid_hien_dieu, plan_annual_id,
     'Active', '2026-06-29 02:00:00Z', '2027-06-29 02:00:00Z',
     true, 'hien.dieu@demo.ecowise.vn',
     '2026-06-29 02:00:00Z', '2026-06-29 02:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- ── 4. Invoices (status=Paid → hiện trong revenue stats) ─────────
  INSERT INTO public."Invoices" (
    subscription_id, invoice_number,
    subject_type, subject_id,
    billing_reason, amount, currency,
    status, issue_date, due_date, paid_at,
    line_items, created_at
  ) VALUES
    (sub_id_1, 'INV-DEMO-2026-0001',
     'User', uid_huong_giang, 'initial_purchase',
     499000, 'VND', 'Paid',
     '2026-06-24', '2099-01-01', '2026-06-24 01:05:00Z',
     '[{"description":"Eco-Cá Nhân Trọn Đời (Lifetime)","quantity":1,"unit_price":499000,"amount":499000}]'::jsonb,
     '2026-06-24 01:05:00Z'),
    (sub_id_2, 'INV-DEMO-2026-0002',
     'User', uid_minh_thu, 'initial_purchase',
     189000, 'VND', 'Paid',
     '2026-06-24', '2027-06-24', '2026-06-24 02:05:00Z',
     '[{"description":"Eco-Cá Nhân (Năm) (Annual)","quantity":1,"unit_price":189000,"amount":189000}]'::jsonb,
     '2026-06-24 02:05:00Z'),
    (sub_id_3, 'INV-DEMO-2026-0003',
     'User', uid_phuong_anh, 'initial_purchase',
     499000, 'VND', 'Paid',
     '2026-06-29', '2099-01-01', '2026-06-29 01:05:00Z',
     '[{"description":"Eco-Cá Nhân Trọn Đời (Lifetime)","quantity":1,"unit_price":499000,"amount":499000}]'::jsonb,
     '2026-06-29 01:05:00Z'),
    (sub_id_4, 'INV-DEMO-2026-0004',
     'User', uid_hien_dieu, 'initial_purchase',
     189000, 'VND', 'Paid',
     '2026-06-29', '2027-06-29', '2026-06-29 02:05:00Z',
     '[{"description":"Eco-Cá Nhân (Năm) (Annual)","quantity":1,"unit_price":189000,"amount":189000}]'::jsonb,
     '2026-06-29 02:05:00Z')
  ON CONFLICT (subscription_id, billing_reason, due_date) DO NOTHING;

END $$;
