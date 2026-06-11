import { notFound, redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { getChallenge } from "@/services/gamification.service";
import { ChallengeForm } from "@/components/gamification/ChallengeForm";
import { T } from "@/components/shared/TranslatedText";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditChallengePage({ params }: PageProps) {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  const { id } = await params;
  const c = await getChallenge(id);
  if (!c) notFound();
  return (
    <div className="flex flex-col gap-6 pt-6">
      <h1 className="text-[#155A03] text-2xl font-bold">
        <T k="admin.challenges.editChallengeTitle" params={{ name: c.name }} />
      </h1>
      <ChallengeForm initial={c} orgId={c.org_id} redirectTo="/admin/challenges" />
    </div>
  );
}
