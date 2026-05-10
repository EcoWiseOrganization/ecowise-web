import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { getOrgArchives } from "@/services/reports.service";
import { OrgReportView } from "./_components/OrgReportView";
import type { ReportArchive } from "@/types/report.types";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function OrgReportPage({ params }: PageProps) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [org, membership, archives] = await Promise.all([
    getOrganizationByIdServer(orgId),
    getMyMembershipServer(orgId, user.id),
    getOrgArchives(orgId),
  ]);

  if (!org) notFound();
  if (!membership || membership.status !== "Active") {
    redirect("/dashboard/organization");
  }

  const isAdmin = membership.role_id === ROLE_ADMIN_ID;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  return (
    <OrgReportView
      orgId={orgId}
      isAdmin={isAdmin}
      initialArchives={archives as unknown as ReportArchive[]}
      defaultStart={start}
      defaultEnd={end}
    />
  );
}
