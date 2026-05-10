import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { listChallenges } from "@/services/gamification.service";
import { ChallengeList } from "@/components/gamification/ChallengeList";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function OrgChallengesPage({ params }: PageProps) {
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

  const challenges = await listChallenges({ orgId });

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#155A03] text-xl font-bold">Org Challenges</h1>
          <p className="text-sm text-[#6E726E]">
            Custom challenges visible only to your team.
          </p>
        </div>
        <Link
          href={`/dashboard/organization/${orgId}/challenges/new`}
          className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold"
        >
          New challenge
        </Link>
      </div>
      <ChallengeList
        challenges={challenges}
        buildEditHref={(id) =>
          `/dashboard/organization/${orgId}/challenges/${id}/edit`
        }
        canDelete
      />
    </div>
  );
}
