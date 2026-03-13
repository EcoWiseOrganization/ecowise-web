import { getAllUsers } from "@/services/user.service";
import { PageHeader } from "../_components/PageHeader";
import { UserTable } from "../_components/UserTable";

export default async function UserManagementPage() {
  const users = await getAllUsers();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="admin.users.title"
        subtitleKey="admin.users.subtitle"
      />

      <UserTable users={users} />
    </div>
  );
}
