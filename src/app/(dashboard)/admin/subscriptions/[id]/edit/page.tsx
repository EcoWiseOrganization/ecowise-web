import { notFound, redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { getPlan } from "@/services/subscription.service";
import { PlanForm } from "../../_components/PlanForm";
import { T } from "@/components/shared/TranslatedText";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPlanPage({ params }: PageProps) {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  const { id } = await params;
  const plan = await getPlan(id);
  if (!plan) notFound();
  return (
    <div className="flex flex-col gap-6 pt-6">
      <h1 className="text-[#155A03] text-2xl font-bold">
        <T k="admin.subscriptions.editPlanTitle" params={{ name: plan.plan_name }} />
      </h1>
      <PlanForm initial={plan} />
    </div>
  );
}
