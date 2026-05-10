import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { listChallenges } from "@/services/gamification.service";
import { ChallengeList } from "@/components/gamification/ChallengeList";

export default async function AdminChallengesPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  const challenges = await listChallenges({ orgId: null });

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#155A03] text-2xl font-bold">Global Challenges</h1>
          <p className="text-sm text-[#6E726E]">
            Curate platform-wide challenges available to every individual user.
          </p>
        </div>
        <Link
          href="/admin/challenges/new"
          className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold"
        >
          New challenge
        </Link>
      </div>
      <ChallengeList
        challenges={challenges}
        buildEditHref={(id) => `/admin/challenges/${id}/edit`}
        canDelete
      />
    </div>
  );
}
