import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { listRewards } from "@/services/gamification.service";
import { deleteRewardAction } from "@/app/actions/gamification.actions";
import { PageHeader } from "../_components/PageHeader";
import { T } from "@/components/shared/TranslatedText";

export default async function AdminRewardsPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  const rewards = await listRewards();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader
          titleKey="admin.rewards.title"
          subtitleKey="admin.rewards.subtitle"
        />
        <Link
          href="/admin/rewards/new"
          className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold"
        >
          <T k="admin.rewards.newReward" />
        </Link>
      </div>

      <div className="bg-white border border-[#DAEDD5] rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[#6E726E] text-xs uppercase">
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2"><T k="admin.rewards.col.name" fallback="Name" /></th>
              <th className="px-3 py-2"><T k="admin.rewards.col.category" fallback="Category" /></th>
              <th className="px-3 py-2"><T k="admin.rewards.col.points" fallback="Points" /></th>
              <th className="px-3 py-2"><T k="admin.rewards.col.stock" fallback="Stock" /></th>
              <th className="px-3 py-2"><T k="admin.rewards.col.fulfillment" fallback="Fulfillment" /></th>
              <th className="px-3 py-2"><T k="admin.rewards.col.status" fallback="Status" /></th>
              <th className="px-3 py-2 text-right" />
            </tr>
          </thead>
          <tbody>
            {rewards.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[#AAAAAA]">
                  <T k="admin.rewards.empty" fallback="No rewards yet." />
                </td>
              </tr>
            ) : (
              rewards.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.category ?? "—"}</td>
                  <td className="px-3 py-2 font-semibold text-[#155A03]">
                    {r.points_cost}
                  </td>
                  <td className="px-3 py-2">{r.total_stock}</td>
                  <td className="px-3 py-2 text-xs">{r.fulfillment}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === "Active"
                          ? "bg-[#f0f9ed] text-[#1F8505]"
                          : r.status === "LowStock"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <T k={`admin.rewardForm.statusOpt.${r.status}`} fallback={r.status} />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-3">
                    <Link
                      href={`/admin/rewards/${r.id}/edit`}
                      className="text-[#1F8505] text-xs hover:underline"
                    >
                      <T k="common.edit" fallback="Edit" />
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await deleteRewardAction(r.id);
                      }}
                      className="inline"
                    >
                      <button
                        type="submit"
                        className="text-red-600 text-xs hover:underline"
                      >
                        <T k="common.archive" fallback="Archive" />
                      </button>
                    </form>
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
