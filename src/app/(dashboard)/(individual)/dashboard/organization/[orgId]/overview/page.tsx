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

  const [org, membership, metrics, employees, events] = await Promise.all([
    getOrganizationByIdServer(orgId),
    getMyMembershipServer(orgId, user.id),
    getOrgMetricsSummary(orgId),
    getEmployeeActivity(orgId),
    getEventsByOrgServer(orgId),
  ]);

  if (!org) notFound();
  if (!membership || membership.status !== "Active") {
    redirect("/dashboard/organization");
  }

  const isAdmin = membership.role_id === ROLE_ADMIN_ID;

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
