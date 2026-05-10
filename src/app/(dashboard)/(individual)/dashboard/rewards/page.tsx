import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  listMyRedemptions,
  listRewards,
} from "@/services/gamification.service";
import { RewardsBrowser } from "./_components/RewardsBrowser";

export default async function RewardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [rewards, redemptions, userRow] = await Promise.all([
    listRewards(),
    listMyRedemptions(user.id),
    (async () => {
      const db = createServiceClient();
      const { data } = await db
        .from("User")
        .select("green_points")
        .eq("id", user.id)
        .single();
      return (data as { green_points: number } | null) ?? { green_points: 0 };
    })(),
  ]);

  return (
    <div className="flex flex-col gap-6 pt-6">
      <PageHeader
        titleKey="page.rewards.title"
        subtitleKey="page.rewards.subtitle"
      />
      <RewardsBrowser
        rewards={rewards}
        redemptions={redemptions}
        myPoints={Number(userRow.green_points) || 0}
      />
    </div>
  );
}
