import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { getOrgMetricsSummary } from "@/services/org-admin.service";
import { OrgTabs } from "./_components/OrgTabs";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [org, membership] = await Promise.all([
    getOrganizationByIdServer(orgId),
    getMyMembershipServer(orgId, user.id),
  ]);

  if (!org) notFound();
  if (!membership || membership.status !== "Active") {
    redirect("/dashboard/organization");
  }

  const isAdmin = membership.role_id === ROLE_ADMIN_ID;

  let pendingReviews = 0;
  if (isAdmin) {
    const m = await getOrgMetricsSummary(orgId);
    pendingReviews = m.pendingReviews;
  }

  return (
    <>
      <OrgTabs orgId={orgId} isAdmin={isAdmin} pendingReviews={pendingReviews} />
      {children}
    </>
  );
}
