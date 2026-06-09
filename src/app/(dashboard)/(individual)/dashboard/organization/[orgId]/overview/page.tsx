import { notFound, redirect } from "next/navigation";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
  getEventsByOrgServer,
} from "@/app/actions/organization.actions";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrgMetricsSummary,
  getEmployeeActivity,
} from "@/services/org-admin.service";
import { OverviewBody } from "./_components/OverviewBody";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function OrgOverviewPage({ params }: PageProps) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolve membership FIRST so we can decide whether to fetch the
  // admin-only employee activity at all — non-admin members shouldn't
  // see the per-coworker email + log breakdown (BR-04 managerial scope).
  const [org, membership, metrics, events] = await Promise.all([
    getOrganizationByIdServer(orgId),
    getMyMembershipServer(orgId, user.id),
    getOrgMetricsSummary(orgId),
    getEventsByOrgServer(orgId),
  ]);

  if (!org) notFound();
  if (!membership || membership.status !== "Active") {
    redirect("/dashboard/organization");
  }

  const isAdmin = membership.role_id === ROLE_ADMIN_ID;

  // Gated fetch: only admins can see per-employee activity (PII: email,
  // total logs, last activity timestamp). Standard members get an empty
  // array and the OverviewBody hides the "Top Contributors" panel for
  // them via the existing `isAdmin` flag.
  const employees = isAdmin ? await getEmployeeActivity(orgId) : [];

  return (
    <OverviewBody
      org={org}
      metrics={metrics}
      employees={employees}
      events={events}
      isAdmin={isAdmin}
    />
  );
}
