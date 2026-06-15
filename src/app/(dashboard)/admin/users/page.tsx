import Link from "next/link";
import { listAdminUsers } from "@/services/user.service";
import { listSubscribedUsers } from "@/services/subscription.service";
import { requireSystemAdmin } from "@/lib/auth/roles";
import { PageHeader } from "../_components/PageHeader";
import { UserTable } from "../_components/UserTable";
import { SubscribedUsersView } from "../_components/SubscribedUsersView";
import { T } from "@/components/shared/TranslatedText";

interface UserManagementPageProps {
  searchParams: Promise<{ page?: string; q?: string; filter?: string }>;
}

function FilterTabs({ active }: { active: "all" | "subscribed" }) {
  const base =
    "px-4 py-2 rounded-xl text-sm font-semibold border transition-colors";
  const on = "bg-[#1F8505] text-white border-[#1F8505]";
  const off = "bg-white text-[#6E726E] border-[#DAEDD5] hover:bg-[#f0f9ed]";
  return (
    <div className="flex gap-2">
      <Link href="/admin/users" className={`${base} ${active === "all" ? on : off}`}>
        <T k="admin.users.filter.all" fallback="All users" />
      </Link>
      <Link
        href="/admin/users?filter=subscribed"
        className={`${base} ${active === "subscribed" ? on : off}`}
      >
        <T k="admin.users.filter.subscribed" fallback="Subscribed" />
      </Link>
    </div>
  );
}

export default async function UserManagementPage({
  searchParams,
}: UserManagementPageProps) {
  // Defence-in-depth: middleware already filters /admin/* to is_admin = true
  // but server actions and direct fetches don't go through middleware.
  await requireSystemAdmin();

  const { page: pageParam, q, filter } = await searchParams;
  const subscribed = filter === "subscribed";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titleKey="admin.users.title" subtitleKey="admin.users.subtitle" />

      <FilterTabs active={subscribed ? "subscribed" : "all"} />

      {subscribed ? (
        <SubscribedUsersView rows={await listSubscribedUsers()} />
      ) : (
        <AllUsers pageParam={pageParam} q={q} />
      )}
    </div>
  );
}

async function AllUsers({ pageParam, q }: { pageParam?: string; q?: string }) {
  const page = Number.parseInt(pageParam ?? "1", 10);
  const { rows, total, pageSize } = await listAdminUsers({
    page: Number.isFinite(page) ? page : 1,
    pageSize: 25,
    search: q,
  });
  return (
    <UserTable
      users={rows}
      total={total}
      page={Math.max(1, page || 1)}
      pageSize={pageSize}
      search={q ?? ""}
    />
  );
}
