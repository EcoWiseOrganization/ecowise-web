import { notFound, redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { getReward } from "@/services/gamification.service";
import { RewardForm } from "@/components/gamification/RewardForm";
import { T } from "@/components/shared/TranslatedText";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRewardPage({ params }: PageProps) {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  const { id } = await params;
  const r = await getReward(id);
  if (!r) notFound();
  return (
    <div className="flex flex-col gap-6 pt-6">
      <h1 className="text-[#155A03] text-2xl font-bold">
        <T k="admin.rewards.editRewardTitle" params={{ name: r.name }} />
      </h1>
      <RewardForm initial={r} redirectTo="/admin/rewards" />
    </div>
  );
}
