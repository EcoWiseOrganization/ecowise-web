import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { listChallenges } from "@/services/gamification.service";
import { ChallengeList } from "@/components/gamification/ChallengeList";
import { PageHeader } from "../_components/PageHeader";
import { T } from "@/components/shared/TranslatedText";

export default async function AdminChallengesPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  const challenges = await listChallenges({ orgId: null });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader
          titleKey="admin.challenges.title"
          subtitleKey="admin.challenges.subtitle"
        />
        <Link
          href="/admin/challenges/new"
          className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold"
        >
          <T k="admin.challenges.newChallenge" />
        </Link>
      </div>
      <ChallengeList
        challenges={challenges}
        editHrefBase="/admin/challenges"
        canDelete
      />
    </div>
  );
}
