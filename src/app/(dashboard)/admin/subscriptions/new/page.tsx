import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { PlanForm } from "../_components/PlanForm";

export default async function NewPlanPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  return (
    <div className="flex flex-col gap-6 pt-6">
      <h1 className="text-[#155A03] text-2xl font-bold">New subscription plan</h1>
      <PlanForm />
    </div>
  );
}
