-- ================================================================
-- EcoWise: Subscription & Billing schema (Phase 7)
-- Migration: 012_subscriptions
--
--   Tables:
--     • SubscriptionPlans  — System Admin–curated catalog (B2B + B2C)
--     • Subscriptions      — active subscription per Org or User
--     • Invoices           — billing history
--     • PaymentMethods     — saved cards / wallet / etc
--     • PaymentIntents     — short-lived transaction records (mock for MVP)
--
--   Idempotent. Seeds 4 default plans so the UI has data to render before a
--   System Admin curates the catalog.
-- ================================================================

-- ── ENUMS ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE subscription_target AS ENUM ('B2B', 'B2C');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_billing_cycle AS ENUM ('Monthly', 'Annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan_status AS ENUM ('Active', 'Inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_subject_type AS ENUM ('Org', 'User');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'Trial', 'Active', 'PastDue', 'Canceled', 'Suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'PendingPayment', 'Paid', 'PastDue', 'Refunded', 'Voided'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_intent_status AS ENUM (
    'Pending', 'Paid', 'Failed', 'Expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── SubscriptionPlans ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SubscriptionPlans" (
  id              UUID                       DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_code       TEXT                       NOT NULL UNIQUE,
  plan_name       TEXT                       NOT NULL,
  target_customer subscription_target        NOT NULL,
  base_price_usd  NUMERIC(12, 2)             NOT NULL DEFAULT 0,
  billing_cycle   subscription_billing_cycle NOT NULL DEFAULT 'Monthly',
  trial_days      INTEGER                    NOT NULL DEFAULT 0,
  max_users       INTEGER,                   -- NULL = unlimited
  max_events      INTEGER,                   -- NULL = unlimited
  features        JSONB                      NOT NULL DEFAULT '[]'::jsonb,
  status          subscription_plan_status   NOT NULL DEFAULT 'Active',
  created_at      TIMESTAMPTZ                NOT NULL DEFAULT now(),
  created_by      UUID                       REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ                NOT NULL DEFAULT now(),
  CONSTRAINT subscription_plans_price_nonneg CHECK (base_price_usd >= 0)
);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_target ON "SubscriptionPlans" (target_customer, status);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON "SubscriptionPlans";
CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON "SubscriptionPlans"
  FOR EACH ROW EXECUTE FUNCTION ghg_update_updated_at();

ALTER TABLE "SubscriptionPlans" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans: read" ON "SubscriptionPlans";
CREATE POLICY "subscription_plans: read"
  ON "SubscriptionPlans" FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "subscription_plans: admin write" ON "SubscriptionPlans";
CREATE POLICY "subscription_plans: admin write"
  ON "SubscriptionPlans" FOR ALL
  TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

DROP TRIGGER IF EXISTS trg_audit_subscription_plans ON "SubscriptionPlans";
CREATE TRIGGER trg_audit_subscription_plans
  AFTER INSERT OR UPDATE OR DELETE ON "SubscriptionPlans"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('subscription_plan');

-- ── Subscriptions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Subscriptions" (
  id                    UUID                        DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_type          subscription_subject_type   NOT NULL,
  subject_id            UUID                        NOT NULL,
  plan_id               UUID                        NOT NULL REFERENCES "SubscriptionPlans"(id),
  status                subscription_status         NOT NULL DEFAULT 'Trial',
  current_period_start  TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  current_period_end    TIMESTAMPTZ                 NOT NULL,
  trial_end             TIMESTAMPTZ,
  auto_renew            BOOLEAN                     NOT NULL DEFAULT true,
  retry_count           INTEGER                     NOT NULL DEFAULT 0,
  canceled_at           TIMESTAMPTZ,
  billing_email         TEXT,
  billing_company_name  TEXT,
  billing_address       TEXT,
  billing_vat_id        TEXT,
  created_at            TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  created_by            UUID                        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at            TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_period_order CHECK (current_period_end > current_period_start)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subject ON "Subscriptions" (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON "Subscriptions" (status);

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON "Subscriptions";
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON "Subscriptions"
  FOR EACH ROW EXECUTE FUNCTION ghg_update_updated_at();

ALTER TABLE "Subscriptions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions: org admin or self" ON "Subscriptions";
CREATE POLICY "subscriptions: org admin or self"
  ON "Subscriptions" FOR SELECT
  TO authenticated
  USING (
    is_system_admin()
    OR (subject_type = 'User' AND subject_id = auth.uid())
    OR (subject_type = 'Org'  AND public.is_emission_org_member(subject_id))
  );

-- Writes via service role (server actions). No authenticated write policy.

DROP TRIGGER IF EXISTS trg_audit_subscriptions ON "Subscriptions";
CREATE TRIGGER trg_audit_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON "Subscriptions"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('subscription', 'subject_id');

-- ── Invoices ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Invoices" (
  id              UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID            REFERENCES "Subscriptions"(id) ON DELETE CASCADE,
  invoice_number  TEXT            NOT NULL UNIQUE,
  subject_type    subscription_subject_type NOT NULL,
  subject_id      UUID            NOT NULL,
  billing_reason  TEXT            NOT NULL,
  amount          NUMERIC(12, 2)  NOT NULL,
  currency        TEXT            NOT NULL DEFAULT 'USD',
  status          invoice_status  NOT NULL DEFAULT 'PendingPayment',
  issue_date      DATE            NOT NULL DEFAULT (now()::date),
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  line_items      JSONB           NOT NULL DEFAULT '[]'::jsonb,
  pdf_url         TEXT,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  created_by      UUID            REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_subject     ON "Invoices" (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON "Invoices" (status);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON "Invoices" (subscription_id);

ALTER TABLE "Invoices" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices: org admin or self" ON "Invoices";
CREATE POLICY "invoices: org admin or self"
  ON "Invoices" FOR SELECT
  TO authenticated
  USING (
    is_system_admin()
    OR (subject_type = 'User' AND subject_id = auth.uid())
    OR (subject_type = 'Org'  AND public.is_emission_org_admin(subject_id))
  );

DROP TRIGGER IF EXISTS trg_audit_invoices ON "Invoices";
CREATE TRIGGER trg_audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON "Invoices"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('invoice', 'subject_id');

-- ── PaymentMethods ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PaymentMethods" (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_type   subscription_subject_type NOT NULL,
  owner_id     UUID         NOT NULL,
  provider     TEXT         NOT NULL DEFAULT 'mock',
  provider_ref TEXT,
  masked_info  TEXT,
  is_default   BOOLEAN      NOT NULL DEFAULT false,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_owner ON "PaymentMethods" (owner_type, owner_id);

ALTER TABLE "PaymentMethods" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_methods: org admin or self" ON "PaymentMethods";
CREATE POLICY "payment_methods: org admin or self"
  ON "PaymentMethods" FOR SELECT
  TO authenticated
  USING (
    is_system_admin()
    OR (owner_type = 'User' AND owner_id = auth.uid())
    OR (owner_type = 'Org'  AND public.is_emission_org_admin(owner_id))
  );

DROP TRIGGER IF EXISTS trg_audit_payment_methods ON "PaymentMethods";
CREATE TRIGGER trg_audit_payment_methods
  AFTER INSERT OR UPDATE OR DELETE ON "PaymentMethods"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('payment_method', 'owner_id');

-- ── PaymentIntents (mock provider) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PaymentIntents" (
  id           UUID                    DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id   UUID                    NOT NULL REFERENCES "Invoices"(id) ON DELETE CASCADE,
  provider     TEXT                    NOT NULL DEFAULT 'mock',
  qr_payload   TEXT,
  amount       NUMERIC(12, 2)          NOT NULL,
  currency     TEXT                    NOT NULL DEFAULT 'USD',
  status       payment_intent_status   NOT NULL DEFAULT 'Pending',
  expires_at   TIMESTAMPTZ             NOT NULL,
  paid_at      TIMESTAMPTZ,
  provider_payload JSONB,
  created_at   TIMESTAMPTZ             NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_invoice ON "PaymentIntents" (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status  ON "PaymentIntents" (status);

ALTER TABLE "PaymentIntents" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_intents: read via invoice" ON "PaymentIntents";
CREATE POLICY "payment_intents: read via invoice"
  ON "PaymentIntents" FOR SELECT
  TO authenticated
  USING (
    is_system_admin()
    OR EXISTS (
      SELECT 1 FROM "Invoices" i
      WHERE i.id = invoice_id
        AND (
          (i.subject_type = 'User' AND i.subject_id = auth.uid())
          OR (i.subject_type = 'Org'  AND public.is_emission_org_admin(i.subject_id))
        )
    )
  );

DROP TRIGGER IF EXISTS trg_audit_payment_intents ON "PaymentIntents";
CREATE TRIGGER trg_audit_payment_intents
  AFTER INSERT OR UPDATE OR DELETE ON "PaymentIntents"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('payment_intent');

-- ── SEED default plans (idempotent) ───────────────────────────────────────
INSERT INTO "SubscriptionPlans" (
  plan_code, plan_name, target_customer, base_price_usd, billing_cycle, trial_days,
  max_users, max_events, features
)
VALUES
  (
    'B2B_TRIAL', 'Business Trial', 'B2B', 0, 'Monthly', 14,
    10, 3,
    '[{"key":"basic_dashboard","label":"Basic Dashboard"},{"key":"team","label":"Team Management (10)"}]'::jsonb
  ),
  (
    'B2B_BASIC', 'Business Basic', 'B2B', 49, 'Monthly', 0,
    25, 10,
    '[{"key":"basic_dashboard","label":"Basic Dashboard"},{"key":"team","label":"Team Management"},{"key":"basic_reports","label":"Standard reports"}]'::jsonb
  ),
  (
    'B2B_PRO', 'Business Pro', 'B2B', 149, 'Monthly', 0,
    100, 50,
    '[{"key":"basic_dashboard","label":"Basic Dashboard"},{"key":"team","label":"Team Management"},{"key":"advanced_reports","label":"Advanced analytics"},{"key":"compliance","label":"Compliance reports"}]'::jsonb
  ),
  (
    'B2B_ENT', 'Business Enterprise', 'B2B', 499, 'Monthly', 0,
    NULL, NULL,
    '[{"key":"basic_dashboard","label":"Basic Dashboard"},{"key":"team","label":"Team Management"},{"key":"advanced_reports","label":"Advanced analytics"},{"key":"compliance","label":"Compliance reports"},{"key":"api","label":"API Access"},{"key":"sso","label":"SSO"}]'::jsonb
  ),
  (
    'B2C_FREE', 'Personal Free', 'B2C', 0, 'Monthly', 0,
    1, 0,
    '[{"key":"personal_logs","label":"Personal logs"},{"key":"basic_targets","label":"Carbon targets"}]'::jsonb
  ),
  (
    'B2C_PLUS', 'Personal Plus', 'B2C', 4.99, 'Monthly', 7,
    1, 0,
    '[{"key":"personal_logs","label":"Personal logs"},{"key":"basic_targets","label":"Carbon targets"},{"key":"advanced_reports","label":"Advanced analytics"},{"key":"recommendations","label":"Tailored recommendations"}]'::jsonb
  )
ON CONFLICT (plan_code) DO NOTHING;
