-- ================================================================
-- EcoWise: Organization & Event Management Schema
-- Migration: 001_organizations_events
-- ================================================================

-- Enable UUID extension (already available in Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLE: organizations
-- Stores registered companies/NGOs using the platform
-- ================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT          NOT NULL,                          -- Registered Legal Name (MSG01: required)
  tax_code    TEXT          NOT NULL,                          -- Tax or Registration Code (MSG01: required)
  industry    TEXT          NOT NULL,                          -- Primary Industry Sector
  org_type    TEXT          NOT NULL                           -- Organization Type
                CHECK (org_type IN ('Enterprise', 'SMB', 'NGO', 'Startup')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by  UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ================================================================
-- TABLE: organization_members
-- Many-to-many between users and organizations with RBAC roles
-- ================================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id          UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id      UUID          NOT NULL REFERENCES public.organizations(id)  ON DELETE CASCADE,
  user_id     UUID          NOT NULL REFERENCES auth.users(id)            ON DELETE CASCADE,
  role        TEXT          NOT NULL DEFAULT 'Standard Member'
                CHECK (role IN ('Organization Admin', 'Standard Member')),
  status      TEXT          NOT NULL DEFAULT 'Active'
                CHECK (status IN ('Active', 'Pending')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- ================================================================
-- TABLE: events  (referred to as "projects" in some SRS docs)
-- Events/projects that belong to an organization
-- ================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id          UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id      UUID          NOT NULL REFERENCES public.organizations(id)  ON DELETE CASCADE,
  name        TEXT          NOT NULL,                          -- Event/Project Name (MSG01: required)
  event_type  TEXT          NOT NULL
                CHECK (event_type IN ('Conference', 'Festival', 'Webinar', 'Workshop', 'Other')),
  status      TEXT          NOT NULL DEFAULT 'Scheduled'
                CHECK (status IN ('Active', 'Scheduled', 'Completed')),
  start_date  DATE          NOT NULL,
  end_date    DATE          NOT NULL,                          -- Must be >= start_date (MSG22 validated in app layer)
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by  UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- DB-level guard for MSG22 (belt-and-suspenders alongside app validation)
  CONSTRAINT events_date_order CHECK (end_date >= start_date)
);

-- ================================================================
-- TABLE: event_assignments
-- Junction table: which employees (org members) are assigned to which event
-- ================================================================
CREATE TABLE IF NOT EXISTS public.event_assignments (
  id          UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id    UUID          NOT NULL REFERENCES public.events(id)   ON DELETE CASCADE,
  user_id     UUID          NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  assigned_by UUID          NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  -- Prevents duplicate assignments (validation also enforced in app layer)
  UNIQUE (event_id, user_id)
);

-- ================================================================
-- INDEXES — improve query performance for common access patterns
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_org_members_org_id     ON public.organization_members (org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id    ON public.organization_members (user_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id          ON public.events               (org_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by      ON public.events               (created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_event_id   ON public.event_assignments    (event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user_id    ON public.event_assignments    (user_id);

-- ================================================================
-- ENABLE ROW LEVEL SECURITY on all new tables
-- ================================================================
ALTER TABLE public.organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_assignments   ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- HELPER FUNCTION: is_org_member
-- Returns TRUE if the calling user is an Active member of the given org.
-- SECURITY DEFINER lets RLS policies call it without recursion risk.
-- ================================================================
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.organization_members
    WHERE  org_id  = p_org_id
      AND  user_id = auth.uid()
      AND  status  = 'Active'
  );
$$;

-- HELPER FUNCTION: is_org_admin
-- Returns TRUE if the calling user is an Organization Admin of the given org.
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.organization_members
    WHERE  org_id  = p_org_id
      AND  user_id = auth.uid()
      AND  role    = 'Organization Admin'
      AND  status  = 'Active'
  );
$$;

-- ================================================================
-- RLS POLICIES: organizations
-- ================================================================

-- Any authenticated user can see orgs they belong to
CREATE POLICY "orgs: members can select"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(id));

-- Any authenticated user can create an org (they become Admin afterward via trigger/app logic)
CREATE POLICY "orgs: auth users can insert"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only Org Admin can update org details
CREATE POLICY "orgs: admin can update"
  ON public.organizations FOR UPDATE
  USING (public.is_org_admin(id));

-- Only Org Admin can delete the org
CREATE POLICY "orgs: admin can delete"
  ON public.organizations FOR DELETE
  USING (public.is_org_admin(id));

-- ================================================================
-- RLS POLICIES: organization_members
-- ================================================================

-- Members of an org can see who else is in their org
CREATE POLICY "org_members: active members can select"
  ON public.organization_members FOR SELECT
  USING (public.is_org_member(org_id));

-- Allow self-insert (when joining as first admin) OR insert by existing admin
CREATE POLICY "org_members: self or admin can insert"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    -- User is adding themselves (bootstrap: creating org)
    auth.uid() = user_id
    OR
    -- An existing admin of that org is adding someone
    public.is_org_admin(org_id)
  );

-- Only org admin can update member status/role
CREATE POLICY "org_members: admin can update"
  ON public.organization_members FOR UPDATE
  USING (public.is_org_admin(org_id));

-- Only org admin can remove members
CREATE POLICY "org_members: admin can delete"
  ON public.organization_members FOR DELETE
  USING (public.is_org_admin(org_id));

-- ================================================================
-- RLS POLICIES: events
-- ================================================================

-- Only org members can view events of their org
CREATE POLICY "events: org members can select"
  ON public.events FOR SELECT
  USING (public.is_org_member(org_id));

-- Any org member can create an event for their org
CREATE POLICY "events: org members can insert"
  ON public.events FOR INSERT
  WITH CHECK (
    public.is_org_member(org_id)
    AND auth.uid() = created_by
  );

-- Only org admin can edit events
CREATE POLICY "events: org admin can update"
  ON public.events FOR UPDATE
  USING (public.is_org_admin(org_id));

-- Only org admin can delete events
CREATE POLICY "events: org admin can delete"
  ON public.events FOR DELETE
  USING (public.is_org_admin(org_id));

-- ================================================================
-- RLS POLICIES: event_assignments
-- ================================================================

-- Org members can view assignments for events in their org
CREATE POLICY "assignments: org members can select"
  ON public.event_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE  e.id = event_id
        AND  public.is_org_member(e.org_id)
    )
  );

-- Org members can assign other org members to events in their org
CREATE POLICY "assignments: org members can insert"
  ON public.event_assignments FOR INSERT
  WITH CHECK (
    auth.uid() = assigned_by
    -- The event belongs to an org the caller is a member of
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE  e.id = event_id
        AND  public.is_org_member(e.org_id)
    )
    -- The user being assigned must also be an active org member
    AND EXISTS (
      SELECT 1 FROM public.events e
      JOIN   public.organization_members om ON om.org_id = e.org_id
      WHERE  e.id          = event_id
        AND  om.user_id    = event_assignments.user_id
        AND  om.status     = 'Active'
    )
  );

-- Assigner or org admin can remove an assignment
CREATE POLICY "assignments: assigner or admin can delete"
  ON public.event_assignments FOR DELETE
  USING (
    auth.uid() = assigned_by
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE  e.id = event_id
        AND  public.is_org_admin(e.org_id)
    )
  );
