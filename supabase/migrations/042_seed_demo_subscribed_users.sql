-- ================================================================
-- EcoWise: Demo subscribed users for presentation
-- Migration: 042_seed_demo_subscribed_users
--
--   24/06/2026: Hoàng Lê Hương Giang (499k Trọn Đời), Mai Minh Thư (189k Năm)
--   29/06/2026: Trần Phương Anh (499k Trọn Đời), Nguyễn Ngọc Hiền Diệu (189k Năm)
--
--   Looks up existing auth users by email — no fake accounts created.
--   Idempotent: re-run safe (fixed sub UUIDs + ON CONFLICT guards).
--   Run manually in Supabase SQL Editor (service-role required).
-- ================================================================

DO $$
DECLARE
  uid_1 UUID; uid_2 UUID; uid_3 UUID; uid_4 UUID;

  -- Fixed sub/invoice UUIDs → idempotent
  sub_id_1 UUID := 'c1000001-0000-0000-0000-000000000001';
  sub_id_2 UUID := 'c1000002-0000-0000-0000-000000000002';
  sub_id_3 UUID := 'c1000003-0000-0000-0000-000000000003';
  sub_id_4 UUID := 'c1000004-0000-0000-0000-000000000004';

  plan_lifetime_id UUID;
  plan_annual_id   UUID;
BEGIN

  -- ── Clean up old fake demo rows (from earlier runs) ──────────────
  DELETE FROM public."Invoices"
    WHERE subscription_id IN (
      'b1000001-0000-0000-0000-000000000001',
      'b1000002-0000-0000-0000-000000000002',
      'b1000003-0000-0000-0000-000000000003',
      'b1000004-0000-0000-0000-000000000004'
    );
  DELETE FROM public."Subscriptions"
    WHERE id IN (
      'b1000001-0000-0000-0000-000000000001',
      'b1000002-0000-0000-0000-000000000002',
      'b1000003-0000-0000-0000-000000000003',
      'b1000004-0000-0000-0000-000000000004'
    );
  DELETE FROM public."User"
    WHERE id IN (
      'a1000001-0000-0000-0000-000000000001',
      'a1000002-0000-0000-0000-000000000002',
      'a1000003-0000-0000-0000-000000000003',
      'a1000004-0000-0000-0000-000000000004'
    );
  DELETE FROM auth.users
    WHERE id IN (
      'a1000001-0000-0000-0000-000000000001',
      'a1000002-0000-0000-0000-000000000002',
      'a1000003-0000-0000-0000-000000000003',
      'a1000004-0000-0000-0000-000000000004'
    );

  -- ── Look up real user UUIDs by email ─────────────────────────────
  SELECT id INTO uid_1 FROM auth.users WHERE email = 'hoanglehuonggiang2005@gmail.com';
  SELECT id INTO uid_2 FROM auth.users WHERE email = 'thummhs180584@fpt.edu.vn';
  SELECT id INTO uid_3 FROM auth.users WHERE email = 'phuonganht381@gmail.com';
  SELECT id INTO uid_4 FROM auth.users WHERE email = 'ngochiendieu@gmail.com';

  SELECT id INTO plan_lifetime_id FROM "SubscriptionPlans" WHERE plan_code = 'ECO_PERSONAL_LIFETIME';
  SELECT id INTO plan_annual_id   FROM "SubscriptionPlans" WHERE plan_code = 'ECO_PERSONAL_ANNUAL';

  IF plan_lifetime_id IS NULL OR plan_annual_id IS NULL THEN
    RAISE EXCEPTION 'Plans not found — ensure migration 040 has been applied.';
  END IF;

  -- ── Update full_name ──────────────────────────────────────────────
  IF uid_1 IS NOT NULL THEN UPDATE public."User" SET full_name = 'Hoàng Lê Hương Giang'   WHERE id = uid_1; END IF;
  IF uid_2 IS NOT NULL THEN UPDATE public."User" SET full_name = 'Mai Minh Thư'            WHERE id = uid_2; END IF;
  IF uid_3 IS NOT NULL THEN UPDATE public."User" SET full_name = 'Trần Phương Anh'         WHERE id = uid_3; END IF;
  IF uid_4 IS NOT NULL THEN UPDATE public."User" SET full_name = 'Nguyễn Ngọc Hiền Diệu'  WHERE id = uid_4; END IF;

  -- ── Subscriptions ─────────────────────────────────────────────────
  IF uid_1 IS NOT NULL THEN
    INSERT INTO public."Subscriptions" (
      id, subject_type, subject_id, plan_id,
      status, current_period_start, current_period_end,
      auto_renew, billing_email, created_at, updated_at
    ) VALUES (
      sub_id_1, 'User', uid_1, plan_lifetime_id,
      'Active', '2026-06-24 01:00:00Z', '2099-01-01 00:00:00Z',
      false, 'hoanglehuonggiang2005@gmail.com',
      '2026-06-24 01:00:00Z', '2026-06-24 01:00:00Z'
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  IF uid_2 IS NOT NULL THEN
    INSERT INTO public."Subscriptions" (
      id, subject_type, subject_id, plan_id,
      status, current_period_start, current_period_end,
      auto_renew, billing_email, created_at, updated_at
    ) VALUES (
      sub_id_2, 'User', uid_2, plan_annual_id,
      'Active', '2026-06-24 02:00:00Z', '2027-06-24 02:00:00Z',
      true, 'thummhs180584@fpt.edu.vn',
      '2026-06-24 02:00:00Z', '2026-06-24 02:00:00Z'
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  IF uid_3 IS NOT NULL THEN
    INSERT INTO public."Subscriptions" (
      id, subject_type, subject_id, plan_id,
      status, current_period_start, current_period_end,
      auto_renew, billing_email, created_at, updated_at
    ) VALUES (
      sub_id_3, 'User', uid_3, plan_lifetime_id,
      'Active', '2026-06-29 01:00:00Z', '2099-01-01 00:00:00Z',
      false, 'phuonganht381@gmail.com',
      '2026-06-29 01:00:00Z', '2026-06-29 01:00:00Z'
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  IF uid_4 IS NOT NULL THEN
    INSERT INTO public."Subscriptions" (
      id, subject_type, subject_id, plan_id,
      status, current_period_start, current_period_end,
      auto_renew, billing_email, created_at, updated_at
    ) VALUES (
      sub_id_4, 'User', uid_4, plan_annual_id,
      'Active', '2026-06-29 02:00:00Z', '2027-06-29 02:00:00Z',
      true, 'ngochiendieu@gmail.com',
      '2026-06-29 02:00:00Z', '2026-06-29 02:00:00Z'
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  -- ── Invoices (status=Paid → hiện trong revenue stats) ─────────────
  IF uid_1 IS NOT NULL THEN
    INSERT INTO public."Invoices" (
      subscription_id, invoice_number, subject_type, subject_id,
      billing_reason, amount, currency, status,
      issue_date, due_date, paid_at, line_items, created_at
    ) VALUES (
      sub_id_1, 'INV-DEMO-2026-0011', 'User', uid_1,
      'initial_purchase', 499000, 'VND', 'Paid',
      '2026-06-24', '2099-01-01', '2026-06-24 01:05:00Z',
      '[{"description":"Eco-Cá Nhân Trọn Đời (Lifetime)","quantity":1,"unit_price":499000,"amount":499000}]'::jsonb,
      '2026-06-24 01:05:00Z'
    ) ON CONFLICT (subscription_id, billing_reason, due_date) DO NOTHING;
  END IF;

  IF uid_2 IS NOT NULL THEN
    INSERT INTO public."Invoices" (
      subscription_id, invoice_number, subject_type, subject_id,
      billing_reason, amount, currency, status,
      issue_date, due_date, paid_at, line_items, created_at
    ) VALUES (
      sub_id_2, 'INV-DEMO-2026-0012', 'User', uid_2,
      'initial_purchase', 189000, 'VND', 'Paid',
      '2026-06-24', '2027-06-24', '2026-06-24 02:05:00Z',
      '[{"description":"Eco-Cá Nhân (Năm) (Annual)","quantity":1,"unit_price":189000,"amount":189000}]'::jsonb,
      '2026-06-24 02:05:00Z'
    ) ON CONFLICT (subscription_id, billing_reason, due_date) DO NOTHING;
  END IF;

  IF uid_3 IS NOT NULL THEN
    INSERT INTO public."Invoices" (
      subscription_id, invoice_number, subject_type, subject_id,
      billing_reason, amount, currency, status,
      issue_date, due_date, paid_at, line_items, created_at
    ) VALUES (
      sub_id_3, 'INV-DEMO-2026-0013', 'User', uid_3,
      'initial_purchase', 499000, 'VND', 'Paid',
      '2026-06-29', '2099-01-01', '2026-06-29 01:05:00Z',
      '[{"description":"Eco-Cá Nhân Trọn Đời (Lifetime)","quantity":1,"unit_price":499000,"amount":499000}]'::jsonb,
      '2026-06-29 01:05:00Z'
    ) ON CONFLICT (subscription_id, billing_reason, due_date) DO NOTHING;
  END IF;

  IF uid_4 IS NOT NULL THEN
    INSERT INTO public."Invoices" (
      subscription_id, invoice_number, subject_type, subject_id,
      billing_reason, amount, currency, status,
      issue_date, due_date, paid_at, line_items, created_at
    ) VALUES (
      sub_id_4, 'INV-DEMO-2026-0014', 'User', uid_4,
      'initial_purchase', 189000, 'VND', 'Paid',
      '2026-06-29', '2027-06-29', '2026-06-29 02:05:00Z',
      '[{"description":"Eco-Cá Nhân (Năm) (Annual)","quantity":1,"unit_price":189000,"amount":189000}]'::jsonb,
      '2026-06-29 02:05:00Z'
    ) ON CONFLICT (subscription_id, billing_reason, due_date) DO NOTHING;
  END IF;

END $$;
