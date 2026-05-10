import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  listChallenges,
  listMyChallenges,
} from "@/services/gamification.service";
import { getMyOrganizationsServer } from "@/app/actions/organization.actions";
import { ChallengesBrowser } from "./_components/ChallengesBrowser";
import type { Challenge } from "@/types/gamification.types";

export default async function ChallengesIndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Pull global + org-scoped (for orgs the user belongs to).
  const [globalRows, orgs, joined] = await Promise.all([
    listChallenges({ orgId: null }),
    getMyOrganizationsServer(),
    listMyChallenges(user.id),
  ]);

  const orgChallenges: Challenge[] = [];
  for (const org of orgs) {
    const rows = await listChallenges({ orgId: org.id });
    orgChallenges.push(...rows);
  }
  const all = [...globalRows, ...orgChallenges].filter(
    (c) => c.status === "Active" || c.status === "Upcoming"
  );

  return (
    <div className="flex flex-col gap-6 pt-6">
      <PageHeader
        titleKey="page.challenges.title"
        subtitleKey="page.challenges.subtitle"
      />
      <ChallengesBrowser challenges={all} joined={joined} />
    </div>
  );
}
