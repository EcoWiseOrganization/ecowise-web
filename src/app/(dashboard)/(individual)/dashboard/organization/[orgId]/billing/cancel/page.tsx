import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { getCurrentSubscription } from "@/services/subscription.service";
import { CancelFlow } from "@/components/billing/CancelFlow";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function OrgCancelPage({ params }: PageProps) {
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

  const sub = await getCurrentSubscription("Org", orgId);
  if (!sub) {
    redirect(`/dashboard/organization/${orgId}/billing`);
  }

  return (
    <div className="pt-2">
      <CancelFlow
        subscription={sub}
        backHref={`/dashboard/organization/${orgId}/billing`}
      />
    </div>
  );
}
