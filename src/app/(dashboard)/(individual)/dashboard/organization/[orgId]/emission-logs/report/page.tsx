import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { getOrgArchives } from "@/services/reports.service";
import { localMonthEndISO, localMonthStartISO } from "@/lib/dates";
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
  // Month-bounds in the user's calendar tz so the report range matches
  // "this month" as the user sees it, not the server's UTC view.
  const start = localMonthStartISO();
  const end = localMonthEndISO();

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
