import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentSubscription,
  listPlans,
} from "@/services/subscription.service";
import { SubscriptionCenter } from "@/components/billing/SubscriptionCenter";

export default async function PersonalBillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [current, plans] = await Promise.all([
    getCurrentSubscription("User", user.id),
    listPlans("B2C"),
  ]);

  return (
    <div className="flex flex-col gap-4 pt-6">
      <div>
        <h1 className="text-[#155A03] text-2xl font-bold">Billing</h1>
        <p className="text-sm text-[#6E726E]">
          Manage your personal subscription and invoices.
        </p>
      </div>
      <SubscriptionCenter
        subjectType="User"
        subjectId={user.id}
        current={current}
        plans={plans.filter((p) => p.status === "Active")}
        usage={null}
        invoicesHref="/dashboard/billing/invoices"
        cancelHref="/dashboard/billing/cancel"
        basePath="/dashboard/billing"
      />
    </div>
  );
}
