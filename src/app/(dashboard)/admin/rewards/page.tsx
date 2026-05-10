import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { listRewards } from "@/services/gamification.service";
import { deleteRewardAction } from "@/app/actions/gamification.actions";

export default async function AdminRewardsPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  const rewards = await listRewards();
  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#155A03] text-2xl font-bold">Reward Catalog</h1>
          <p className="text-sm text-[#6E726E]">
            Curate items individuals can redeem with green points.
          </p>
        </div>
        <Link
          href="/admin/rewards/new"
          className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold"
        >
          New reward
        </Link>
      </div>

      <div className="bg-white border border-[#DAEDD5] rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[#6E726E] text-xs uppercase">
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Points</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Fulfillment</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right" />
            </tr>
          </thead>
          <tbody>
            {rewards.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[#AAAAAA]">
                  No rewards yet.
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
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-3">
                    <Link
                      href={`/admin/rewards/${r.id}/edit`}
                      className="text-[#1F8505] text-xs hover:underline"
                    >
                      Edit
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
                        Archive
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
