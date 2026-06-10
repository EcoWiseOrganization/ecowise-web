import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { listPlans } from "@/services/subscription.service";

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
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#155A03] text-2xl font-bold">Subscription Plans</h1>
          <p className="text-sm text-[#6E726E]">
            Manage B2B and B2C plans and their feature matrix.
          </p>
        </div>
        <Link
          href="/admin/subscriptions/new"
          className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold"
        >
          New plan
        </Link>
      </div>

      <div className="bg-white border border-[#DAEDD5] rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[#6E726E] text-xs uppercase">
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Cycle</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Trial</th>
              <th className="px-3 py-2">Max users</th>
              <th className="px-3 py-2">Max events</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-[#AAAAAA]">
                  No plans yet.
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
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/subscriptions/${p.id}/edit`}
                      className="text-[#1F8505] text-xs hover:underline"
                    >
                      Edit
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
