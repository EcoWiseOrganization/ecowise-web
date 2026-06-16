-- ================================================================
-- EcoWise: move existing personal (User) subscriptions off the retired
-- business-styled B2C plans onto the two real individual plans, and fix
-- their invoices so the admin "subscribed users" list and the revenue
-- stats show the correct VND amounts (189k/năm, 499k trọn đời).
-- Migration: 041_repoint_legacy_user_subscriptions
--
--   Mapping (by the retired plan's billing cycle):
--     • Lifetime  → ECO_PERSONAL_LIFETIME  (499,000 VND)
--     • otherwise → ECO_PERSONAL_ANNUAL    (189,000 VND)
--
--   Only subject_type = 'User' rows on now-Inactive B2C plans are touched;
--   organization (B2B) subscriptions are left alone. Idempotent — re-running
--   is a no-op because repointed subs no longer match the Inactive filter.
-- ================================================================

-- 1a. Legacy lifetime user subs → Eco-Cá Nhân Trọn Đời.
UPDATE "Subscriptions" s
   SET plan_id    = np.id,
       updated_at = now()
  FROM "SubscriptionPlans" old, "SubscriptionPlans" np
 WHERE s.plan_id          = old.id
   AND np.plan_code        = 'ECO_PERSONAL_LIFETIME'
   AND s.subject_type      = 'User'
   AND old.target_customer = 'B2C'
   AND old.status          = 'Inactive'
   AND old.billing_cycle   = 'Lifetime';

-- 1b. Other legacy user subs (annual/monthly) → Eco-Cá Nhân (Năm).
UPDATE "Subscriptions" s
   SET plan_id    = np.id,
       updated_at = now()
  FROM "SubscriptionPlans" old, "SubscriptionPlans" np
 WHERE s.plan_id          = old.id
   AND np.plan_code        = 'ECO_PERSONAL_ANNUAL'
   AND s.subject_type      = 'User'
   AND old.target_customer = 'B2C'
   AND old.status          = 'Inactive'
   AND old.billing_cycle  <> 'Lifetime';

-- 2. Re-price every invoice of a user sub now on a personal plan, and rebuild
--    its single line item to match the new plan name + price. This is what the
--    admin "SỐ TIỀN" column and the monthly-revenue metric read.
UPDATE "Invoices" i
   SET amount     = p.base_price_usd,
       currency   = 'VND',
       line_items = jsonb_build_array(
         jsonb_build_object(
           'description', p.plan_name || ' (' || p.billing_cycle || ')',
           'quantity',    1,
           'unit_price',  p.base_price_usd,
           'amount',      p.base_price_usd
         )
       )
  FROM "Subscriptions" s
  JOIN "SubscriptionPlans" p ON p.id = s.plan_id
 WHERE i.subscription_id = s.id
   AND s.subject_type    = 'User'
   AND p.plan_code IN ('ECO_PERSONAL_ANNUAL', 'ECO_PERSONAL_LIFETIME');

-- 3. Keep PaymentIntents in sync with their (now corrected) invoice amount.
UPDATE "PaymentIntents" pi
   SET amount   = i.amount,
       currency = i.currency
  FROM "Invoices" i
  JOIN "Subscriptions" s     ON s.id = i.subscription_id
  JOIN "SubscriptionPlans" p ON p.id = s.plan_id
 WHERE pi.invoice_id   = i.id
   AND s.subject_type  = 'User'
   AND p.plan_code IN ('ECO_PERSONAL_ANNUAL', 'ECO_PERSONAL_LIFETIME');
