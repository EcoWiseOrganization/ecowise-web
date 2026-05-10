import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { ChallengeForm } from "@/components/gamification/ChallengeForm";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function NewOrgChallengePage({ params }: PageProps) {
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

  return (
    <div className="flex flex-col gap-6 pt-2">
      <h1 className="text-[#155A03] text-xl font-bold">New org challenge</h1>
      <ChallengeForm
        orgId={orgId}
        redirectTo={`/dashboard/organization/${orgId}/challenges`}
      />
    </div>
  );
}
