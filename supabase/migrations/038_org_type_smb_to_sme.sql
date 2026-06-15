-- ================================================================
-- EcoWise: rename org type SMB → SME
-- Migration: 038_org_type_smb_to_sme
--
--   "SMB" (Small & Medium Business) was the wrong term; the product
--   targets SMEs (Small & Medium Enterprise). Re-label existing rows.
--   The live "Organization".org_type column has no CHECK constraint, so a
--   plain data update is all that's required. Idempotent.
-- ================================================================

UPDATE "Organization"
   SET org_type = 'SME'
 WHERE org_type = 'SMB';
