import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getEmployeeActivity,
  getInviteCapacity,
} from "@/services/org-admin.service";
import { EmployeeManager } from "./_components/EmployeeManager";
import type { MembershipRow } from "@/hooks/useEmployeeManager";
import type { MemberStatus } from "@/types/organization.types";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function EmployeesPage({ params }: PageProps) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [org, membership] = await Promise.all([
    getOrganizationByIdServer(orgId),
    getMyMembershipServer(orgId, user.id),
  ]);

  if (!org) notFound();
  if (
    !membership ||
    membership.status !== "Active" ||
    membership.role_id !== ROLE_ADMIN_ID
  ) {
    redirect(`/dashboard/organization/${orgId}/overview`);
  }

  const [activity, capacity, memberRows] = await Promise.all([
    getEmployeeActivity(orgId),
    getInviteCapacity(orgId),
    (async () => {
      const db = createServiceClient();
      const { data } = await db
        .from("OrganizationMembers")
        .select("id, user_id, role_id, status")
        .eq("org_id", orgId);
      return (data ?? []) as Array<{
        id: string;
        user_id: string;
        role_id: string;
        status: MemberStatus;
      }>;
    })(),
  ]);

  // Merge: each membership row + activity stats.
  const byUser = new Map(activity.map((a) => [a.user_id, a]));
  const initialRows: MembershipRow[] = memberRows.map((m) => {
    const a = byUser.get(m.user_id);
    return {
      member_id: m.id,
      user_id: m.user_id,
      full_name: a?.full_name ?? null,
      email: a?.email ?? "—",
      role_id: m.role_id,
      status: m.status,
      total_logs: a?.total_logs ?? 0,
      total_co2e_kg: a?.total_co2e_kg ?? 0,
      last_activity_at: a?.last_activity_at ?? null,
    };
  });

  return (
    <EmployeeManager orgId={orgId} initialRows={initialRows} capacity={capacity} />
  );
}
