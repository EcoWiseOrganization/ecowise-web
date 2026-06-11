import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { RewardForm } from "@/components/gamification/RewardForm";
import { T } from "@/components/shared/TranslatedText";

export default async function NewRewardPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  return (
    <div className="flex flex-col gap-6 pt-6">
      <h1 className="text-[#155A03] text-2xl font-bold">
        <T k="admin.rewards.newRewardTitle" />
      </h1>
      <RewardForm redirectTo="/admin/rewards" />
    </div>
  );
}
