import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { listPlans } from "@/services/subscription.service";
import { PageHeader } from "../_components/PageHeader";
import { T } from "@/components/shared/TranslatedText";

export default async function AdminSubscriptionsPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }

  // System-admin catalog view: include Inactive (grandfathered) plans
  // so admins can still see + edit historical pricing tiers. Public
  // billing pages call `listPlans(target)` without the flag and only
  // see Active rows.
  const plans = await listPlans(undefined, { includeInactive: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader
          titleKey="admin.subscriptions.title"
          subtitleKey="admin.subscriptions.subtitle"
        />
        <div className="flex items-center gap-2">
          <Link
            href="/admin/subscriptions/upgrade-requests"
            className="px-4 py-2 rounded-lg border border-[#DAEDD5] text-[#1F8505] text-sm font-semibold hover:bg-[#f0f9ed]"
          >
            <T k="admin.menu.upgradeRequests" />
          </Link>
          <Link
            href="/admin/subscriptions/new"
            className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold"
          >
            <T k="admin.subscriptions.newPlan" />
          </Link>
        </div>
      </div>

      <div className="bg-white border border-[#DAEDD5] rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[#6E726E] text-xs uppercase">
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2"><T k="admin.subscriptions.col.code" fallback="Code" /></th>
              <th className="px-3 py-2"><T k="admin.subscriptions.col.name" fallback="Name" /></th>
              <th className="px-3 py-2"><T k="admin.subscriptions.col.target" fallback="Target" /></th>
              <th className="px-3 py-2"><T k="admin.subscriptions.col.cycle" fallback="Cycle" /></th>
              <th className="px-3 py-2"><T k="admin.subscriptions.col.price" fallback="Price" /></th>
              <th className="px-3 py-2"><T k="admin.subscriptions.col.trial" fallback="Trial" /></th>
              <th className="px-3 py-2"><T k="admin.subscriptions.col.maxUsers" fallback="Max users" /></th>
              <th className="px-3 py-2"><T k="admin.subscriptions.col.maxEvents" fallback="Max events" /></th>
              <th className="px-3 py-2"><T k="admin.subscriptions.col.status" fallback="Status" /></th>
              <th className="px-3 py-2 text-right"><T k="admin.subscriptions.col.actions" fallback="Actions" /></th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-[#AAAAAA]">
                  <T k="admin.subscriptions.empty" fallback="No plans yet." />
                </td>
              </tr>
            ) : (
              plans.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2 font-mono">{p.plan_code}</td>
                  <td className="px-3 py-2 font-medium">{p.plan_name}</td>
                  <td className="px-3 py-2">{p.target_customer}</td>
                  <td className="px-3 py-2">{p.billing_cycle}</td>
                  <td className="px-3 py-2 font-semibold text-[#155A03]">
                    ${Number(p.base_price_usd).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">{p.trial_days}d</td>
                  <td className="px-3 py-2">
                    {p.max_users === null ? "∞" : p.max_users}
                  </td>
                  <td className="px-3 py-2">
                    {p.max_events === null ? "∞" : p.max_events}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === "Active"
                          ? "bg-[#f0f9ed] text-[#1F8505]"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <T k={`admin.planForm.status${p.status}`} fallback={p.status} />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/subscriptions/${p.id}/edit`}
                      className="text-[#1F8505] text-xs hover:underline"
                    >
                      <T k="common.edit" fallback="Edit" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
