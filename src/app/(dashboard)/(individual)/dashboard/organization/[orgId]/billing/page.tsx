import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import {
  getCurrentSubscription,
  getOrgUsage,
  listPlans,
} from "@/services/subscription.service";
import { SubscriptionCenter } from "@/components/billing/SubscriptionCenter";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function OrgBillingPage({ params }: PageProps) {
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

  const [current, plans, usage] = await Promise.all([
    getCurrentSubscription("Org", orgId),
    listPlans("B2B"),
    getOrgUsage(orgId),
  ]);

  return (
    <SubscriptionCenter
      subjectType="Org"
      subjectId={orgId}
      current={current}
      plans={plans.filter((p) => p.status === "Active")}
      usage={usage}
      invoicesHref={`/dashboard/organization/${orgId}/billing/invoices`}
      basePath={`/dashboard/organization/${orgId}/billing`}
    />
  );
}
