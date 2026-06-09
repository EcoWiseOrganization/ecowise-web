import { listAdminUsers } from "@/services/user.service";
import { requireSystemAdmin } from "@/lib/auth/roles";
import { PageHeader } from "../_components/PageHeader";
import { UserTable } from "../_components/UserTable";

interface UserManagementPageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function UserManagementPage({
  searchParams,
}: UserManagementPageProps) {
  // Defence-in-depth: middleware already filters /admin/* to is_admin = true
  // but server actions and direct fetches don't go through middleware. The
  // explicit check makes the admin gate explicit + survives middleware bugs.
  await requireSystemAdmin();

  const { page: pageParam, q } = await searchParams;
  const page = Number.parseInt(pageParam ?? "1", 10);
  const { rows, total, pageSize } = await listAdminUsers({
    page: Number.isFinite(page) ? page : 1,
    pageSize: 25,
    search: q,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="admin.users.title"
        subtitleKey="admin.users.subtitle"
      />

      <UserTable
        users={rows}
        total={total}
        page={Math.max(1, page || 1)}
        pageSize={pageSize}
        search={q ?? ""}
      />
    </div>
  );
}
