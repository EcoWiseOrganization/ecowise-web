import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { listUpgradeRequests } from "@/services/upgrade-request.service";
import { PageHeader } from "../../_components/PageHeader";
import { UpgradeRequestsView } from "../_components/UpgradeRequestsView";

export default async function AdminUpgradeRequestsPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }

  // Default the queue to Pending — the actionable set. The view lets admins
  // switch to other statuses for history.
  const initial = await listUpgradeRequests("Pending");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="admin.upgradeRequests.title"
        subtitleKey="admin.upgradeRequests.subtitle"
      />
      <UpgradeRequestsView initial={initial} />
    </div>
  );
}
