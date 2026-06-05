-- ============================================================================
-- Migration 017 — `emission-evidence` Storage bucket + RLS
-- ----------------------------------------------------------------------------
-- Wires up the bucket originally sketched (commented-out) in
-- migration 003. Mobile attaches a photo / receipt / spreadsheet to an
-- emission log; column `EmissionLogs.evidence_url` stores the storage path
-- (or the signed URL the caller resolves at fetch time).
--
-- Bucket is PRIVATE — evidence may include invoices, receipts, or other
-- documents the user shouldn't expose by URL guessing. Reads go through
-- short-lived signed URLs requested by the owning user. Path convention:
-- `<auth.uid>/<filename>` — matches the avatars pattern (migration 006) so
-- the same client-side helper can serve both buckets.
--
-- Org-admin read access for evidence belonging to logs in their org is
-- intentionally NOT added here; the existing table-naming inconsistency
-- between `organization_members` (lowercase) and quoted PascalCase
-- references elsewhere makes a cross-table policy fragile until that's
-- consolidated. Org-side reads happen via signed URLs minted server-side
-- after RLS on `"EmissionLogs"` confirms membership.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'emission-evidence',
  'emission-evidence',
  false,
  10485760,  -- 10 MB; covers photos + small spreadsheets/PDFs
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── RLS — owner-prefixed objects, no public read ───────────────────────────
DROP POLICY IF EXISTS "emission-evidence: owner read" ON storage.objects;
CREATE POLICY "emission-evidence: owner read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'emission-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "emission-evidence: owner write" ON storage.objects;
CREATE POLICY "emission-evidence: owner write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'emission-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "emission-evidence: owner update" ON storage.objects;
CREATE POLICY "emission-evidence: owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'emission-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "emission-evidence: owner delete" ON storage.objects;
CREATE POLICY "emission-evidence: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'emission-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
