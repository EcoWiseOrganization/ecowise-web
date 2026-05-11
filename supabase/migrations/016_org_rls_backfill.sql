-- ================================================================
-- EcoWise: RLS backfill for legacy PascalCase org tables (Phase 11.5)
-- Migration: 016_org_rls_backfill
--
-- The original migration 001 declared policies on snake_case tables
-- (organizations, organization_members) but the live database has
-- PascalCase variants ("Organization", "OrganizationMembers") created by
-- a pre-existing setup, so the policies never landed there.
--
-- This migration:
--   1. Backfills SELECT/INSERT/UPDATE/DELETE policies on the PascalCase
--      tables so authenticated client-side queries follow the same
--      rules as service-role actions.
--   2. Uses the helper functions from migration 003
--      (`is_emission_org_member`, `is_emission_org_admin`) which already
--      reference the PascalCase tables.
-- Idempotent.
-- ================================================================

ALTER TABLE "Organization"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMembers"  ENABLE ROW LEVEL SECURITY;

-- ── Organization policies ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Organization: members can select" ON "Organization";
CREATE POLICY "Organization: members can select"
  ON "Organization" FOR SELECT
  TO authenticated
  USING (public.is_emission_org_member(id) OR is_system_admin());

DROP POLICY IF EXISTS "Organization: auth can insert (as creator)" ON "Organization";
CREATE POLICY "Organization: auth can insert (as creator)"
  ON "Organization" FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Organization: admin can update" ON "Organization";
CREATE POLICY "Organization: admin can update"
  ON "Organization" FOR UPDATE
  TO authenticated
  USING (public.is_emission_org_admin(id))
  WITH CHECK (public.is_emission_org_admin(id));

DROP POLICY IF EXISTS "Organization: admin can delete" ON "Organization";
CREATE POLICY "Organization: admin can delete"
  ON "Organization" FOR DELETE
  TO authenticated
  USING (public.is_emission_org_admin(id));

-- ── OrganizationMembers policies ──────────────────────────────────────────
DROP POLICY IF EXISTS "OrganizationMembers: members can select" ON "OrganizationMembers";
CREATE POLICY "OrganizationMembers: members can select"
  ON "OrganizationMembers" FOR SELECT
  TO authenticated
  USING (
    public.is_emission_org_member(org_id)
    OR user_id = auth.uid()
    OR is_system_admin()
  );

DROP POLICY IF EXISTS "OrganizationMembers: self or admin can insert" ON "OrganizationMembers";
CREATE POLICY "OrganizationMembers: self or admin can insert"
  ON "OrganizationMembers" FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_emission_org_admin(org_id)
  );

DROP POLICY IF EXISTS "OrganizationMembers: admin can update" ON "OrganizationMembers";
CREATE POLICY "OrganizationMembers: admin can update"
  ON "OrganizationMembers" FOR UPDATE
  TO authenticated
  USING (public.is_emission_org_admin(org_id))
  WITH CHECK (public.is_emission_org_admin(org_id));

DROP POLICY IF EXISTS "OrganizationMembers: admin can delete" ON "OrganizationMembers";
CREATE POLICY "OrganizationMembers: admin can delete"
  ON "OrganizationMembers" FOR DELETE
  TO authenticated
  USING (public.is_emission_org_admin(org_id));
