import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSubscription } from "@/services/subscription.service";
import { CancelFlow } from "@/components/billing/CancelFlow";

export default async function PersonalCancelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sub = await getCurrentSubscription("User", user.id);
  if (!sub) redirect("/dashboard/billing");

  return (
    <div className="pt-6">
      <CancelFlow subscription={sub} backHref="/dashboard/billing" />
    </div>
  );
}
