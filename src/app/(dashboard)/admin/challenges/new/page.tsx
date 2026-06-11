import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { ChallengeForm } from "@/components/gamification/ChallengeForm";
import { T } from "@/components/shared/TranslatedText";

export default async function NewGlobalChallengePage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  return (
    <div className="flex flex-col gap-6 pt-6">
      <h1 className="text-[#155A03] text-2xl font-bold">
        <T k="admin.challenges.newChallengeTitle" />
      </h1>
      <ChallengeForm orgId={null} redirectTo="/admin/challenges" />
    </div>
  );
}
