import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentSubscription,
  listPlans,
} from "@/services/subscription.service";
import { getLatestRequestForSubject } from "@/services/upgrade-request.service";
import { SubscriptionCenter } from "@/components/billing/SubscriptionCenter";
import { T } from "@/components/shared/TranslatedText";

export default async function PersonalBillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [current, plans, pendingRequest] = await Promise.all([
    getCurrentSubscription("User", user.id),
    listPlans("B2C"),
    getLatestRequestForSubject("User", user.id),
  ]);

  return (
    <div className="flex flex-col gap-4 pt-6">
      <div>
        <h1 className="text-[#155A03] text-2xl font-bold">
          <T k="billing.title" />
        </h1>
        <p className="text-sm text-[#6E726E]">
          <T k="billing.subtitle" />
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
        pendingRequest={pendingRequest}
      />
    </div>
  );
}
