import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { getLeaderboard } from "@/services/gamification.service";
import { LeaderboardView } from "./_components/LeaderboardView";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const initial = await getLeaderboard("all");
  return (
    <div className="flex flex-col gap-6 pt-6">
      <PageHeader
        titleKey="page.leaderboard.title"
        subtitleKey="page.leaderboard.subtitle"
      />
      <LeaderboardView initial={initial} />
    </div>
  );
}
