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

  // Resolve org memberships once, then make a SINGLE batched query that
  // unions global + every org-scoped challenge. The previous version
  // looped `listChallenges({ orgId })` per org → N+1 DB round-trips on
  // every page render for users with multiple memberships.
  const orgs = await getMyOrganizationsServer();
  const orgIds = orgs.map((o) => o.id);

  const [allChallenges, joined] = await Promise.all([
    orgIds.length > 0
      ? listChallenges({ orgIds, includeGlobal: true })
      : listChallenges({ orgId: null }),
    listMyChallenges(user.id),
  ]);

  const now = new Date();
  const visible: Challenge[] = allChallenges.filter((c) => {
    if (c.status !== "Active" && c.status !== "Upcoming") return false;
    const endDate = new Date(c.end_date);
    endDate.setHours(23, 59, 59, 999);
    return endDate >= now;
  });

  return (
    <div className="flex flex-col gap-6 pt-6">
      <PageHeader
        titleKey="page.challenges.title"
        subtitleKey="page.challenges.subtitle"
      />
      <ChallengesBrowser challenges={visible} joined={joined} />
    </div>
  );
}
