import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { getChallenge } from "@/services/gamification.service";
import { ChallengeForm } from "@/components/gamification/ChallengeForm";

interface PageProps {
  params: Promise<{ orgId: string; challengeId: string }>;
}

export default async function EditOrgChallengePage({ params }: PageProps) {
  const { orgId, challengeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [org, membership, ch] = await Promise.all([
    getOrganizationByIdServer(orgId),
    getMyMembershipServer(orgId, user.id),
    getChallenge(challengeId),
  ]);
  if (!org || !ch) notFound();
  if (ch.org_id !== orgId) notFound();
  if (
    !membership ||
    membership.status !== "Active" ||
    membership.role_id !== ROLE_ADMIN_ID
  ) {
    redirect(`/dashboard/organization/${orgId}/overview`);
  }

  return (
    <div className="flex flex-col gap-6 pt-2">
      <h1 className="text-[#155A03] text-xl font-bold">Edit: {ch.name}</h1>
      <ChallengeForm
        initial={ch}
        orgId={orgId}
        redirectTo={`/dashboard/organization/${orgId}/challenges`}
      />
    </div>
  );
}
