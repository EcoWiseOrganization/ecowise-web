-- ================================================================
-- EcoWise: Public contact messages (Phase 2)
-- Migration: 007_contact_messages
--   • Submitted via /api/public/contact (no auth)
--   • System Admin only SELECT (lead inbox)
--   • Audit trigger via existing audit_table_change()
-- Idempotent: safe to re-run.
-- ================================================================

DO $$ BEGIN
  CREATE TYPE contact_message_status AS ENUM ('new', 'read', 'archived', 'spam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ContactMessages" (
  id           UUID                   DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT                   NOT NULL,
  email        TEXT                   NOT NULL,
  subject      TEXT,
  message      TEXT                   NOT NULL,
  status       contact_message_status NOT NULL DEFAULT 'new',
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ            NOT NULL DEFAULT now(),
  -- Soft per-message constraints
  CONSTRAINT contact_messages_name_len    CHECK (char_length(name)    BETWEEN 1 AND 200),
  CONSTRAINT contact_messages_email_len   CHECK (char_length(email)   BETWEEN 3 AND 320),
  CONSTRAINT contact_messages_message_len CHECK (char_length(message) BETWEEN 1 AND 5000)
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON "ContactMessages" (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status     ON "ContactMessages" (status);

-- Rate-limit table: keyed by IP. Each row records a single submission so we
-- can count submissions in a sliding window quickly (small table).
CREATE TABLE IF NOT EXISTS "ContactRateLimits" (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address  TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_rate_ip_time ON "ContactRateLimits" (ip_address, created_at DESC);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────
ALTER TABLE "ContactMessages"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactRateLimits" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_messages: system admin can select" ON "ContactMessages";
CREATE POLICY "contact_messages: system admin can select"
  ON "ContactMessages" FOR SELECT
  TO authenticated
  USING (is_system_admin());

DROP POLICY IF EXISTS "contact_messages: system admin can update" ON "ContactMessages";
CREATE POLICY "contact_messages: system admin can update"
  ON "ContactMessages" FOR UPDATE
  TO authenticated
  USING (is_system_admin());

-- INSERTs go through service role (bypasses RLS). Anon clients have no policy
-- so cannot reach the table directly — they must hit the API route.

-- Rate limit table: same — service-role only access.

-- ── AUDIT TRIGGER (BR-16) ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_contact_messages ON "ContactMessages";
CREATE TRIGGER trg_audit_contact_messages
  AFTER INSERT OR UPDATE OR DELETE ON "ContactMessages"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('contact_message');

COMMENT ON TABLE  "ContactMessages"   IS 'Phase 2: leads submitted via /contact public form.';
COMMENT ON TABLE  "ContactRateLimits" IS 'Phase 2: per-IP submission timestamps for the contact form rate limiter.';
