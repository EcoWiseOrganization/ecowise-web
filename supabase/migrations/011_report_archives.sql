-- ================================================================
-- EcoWise: Report Archives storage bucket (Phase 6)
-- Migration: 011_report_archives
--   • Private storage bucket for archived report PDFs/XLSX/CSV.
--   • Org members can read their org's report files; service-role writes.
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-archives',
  'report-archives',
  false,
  52428800,  -- 50 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS — read scoped by org_id prefix; writes via service role only.
DROP POLICY IF EXISTS "report-archives: org members read" ON storage.objects;
CREATE POLICY "report-archives: org members read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-archives'
    AND public.is_emission_org_member(
      ((storage.foldername(name))[1])::uuid
    )
  );

-- ── Track archived reports for audit / re-download (UC-27) ────────────────
DO $$ BEGIN
  CREATE TYPE report_format AS ENUM ('pdf', 'xlsx', 'csv');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_kind AS ENUM ('emission_summary', 'compliance', 'personal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ReportArchives" (
  id            UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        UUID            REFERENCES "Organization"(id) ON DELETE CASCADE,
  user_id       UUID            REFERENCES auth.users(id)     ON DELETE SET NULL,
  kind          report_kind     NOT NULL,
  format        report_format   NOT NULL,
  storage_path  TEXT            NOT NULL,
  period_start  DATE,
  period_end    DATE,
  total_co2e_kg NUMERIC(18, 4),
  log_count     INTEGER,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  created_by    UUID            REFERENCES auth.users(id)     ON DELETE SET NULL,
  CONSTRAINT report_archives_subject CHECK (
    (org_id IS NOT NULL) OR (user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_report_archives_org   ON "ReportArchives" (org_id);
CREATE INDEX IF NOT EXISTS idx_report_archives_user  ON "ReportArchives" (user_id);
CREATE INDEX IF NOT EXISTS idx_report_archives_kind  ON "ReportArchives" (kind);

ALTER TABLE "ReportArchives" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_archives: org member select" ON "ReportArchives";
CREATE POLICY "report_archives: org member select"
  ON "ReportArchives" FOR SELECT
  TO authenticated
  USING (
    (org_id IS NOT NULL AND public.is_emission_org_member(org_id))
    OR (user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS trg_audit_report_archives ON "ReportArchives";
CREATE TRIGGER trg_audit_report_archives
  AFTER INSERT OR UPDATE OR DELETE ON "ReportArchives"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('report');

COMMENT ON TABLE "ReportArchives" IS
  'Phase 6: catalog of generated emission/compliance/personal reports.';
