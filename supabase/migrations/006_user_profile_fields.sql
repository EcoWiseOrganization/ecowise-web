-- ================================================================
-- EcoWise: User Profile Fields (Phase 1)
-- Migration: 006_user_profile_fields
-- Adds optional profile fields and tracks last login.
-- Idempotent: safe to re-run.
-- ================================================================

-- ── 1) Extend "User" table ────────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS phone         TEXT,
  ADD COLUMN IF NOT EXISTS bio           TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url    TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ;

COMMENT ON COLUMN "User".phone         IS 'Optional phone number (E.164 recommended).';
COMMENT ON COLUMN "User".bio           IS 'Short user bio shown on profile screen.';
COMMENT ON COLUMN "User".avatar_url    IS 'Public URL of avatar in storage bucket "avatars".';
COMMENT ON COLUMN "User".last_login_at IS 'Last successful sign-in timestamp.';
COMMENT ON COLUMN "User".deleted_at    IS 'BR-02: when set, account is soft-anonymized; PII fields scrubbed but emission_logs retained.';

-- Self-update RLS: a user can read + update their own row only.
-- (System Admin reads via service-role.)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user: self select" ON "User";
CREATE POLICY "user: self select"
  ON "User" FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR is_system_admin());

DROP POLICY IF EXISTS "user: self update" ON "User";
CREATE POLICY "user: self update"
  ON "User" FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── 2) Storage bucket: "avatars" (public read, owner write) ────────────────
-- Bucket is created idempotently. Allowed mime restricted to common image
-- formats; size limit 2MB.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: owner-only writes (path prefix = user id), public read.
DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars: owner write" ON storage.objects;
CREATE POLICY "avatars: owner write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars: owner update" ON storage.objects;
CREATE POLICY "avatars: owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars: owner delete" ON storage.objects;
CREATE POLICY "avatars: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 3) Audit trigger for "User" so profile updates and password changes are
--      auditable per BR-16. The generic audit_table_change function lives in
--      migration 004.
DROP TRIGGER IF EXISTS trg_audit_user ON "User";
CREATE TRIGGER trg_audit_user
  AFTER INSERT OR UPDATE OR DELETE ON "User"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('user', 'id');
