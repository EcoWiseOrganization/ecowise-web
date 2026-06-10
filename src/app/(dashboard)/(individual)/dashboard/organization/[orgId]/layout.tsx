import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { countPendingReviews } from "@/services/org-admin.service";
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

  // The layout only needs the pending-review badge count — calling the
  // full `getOrgMetricsSummary` here paid for 4 extra queries
  // (EmissionLogs sums per scope + members + events) on every nav
  // inside the org subtree. `countPendingReviews` is a single
  // head-only count.
  const pendingReviews = isAdmin ? await countPendingReviews(orgId) : 0;

  return (
    <>
      <OrgTabs orgId={orgId} isAdmin={isAdmin} pendingReviews={pendingReviews} />
      {children}
    </>
  );
}
