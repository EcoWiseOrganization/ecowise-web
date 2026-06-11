import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { searchOrganizations } from "@/services/admin-orgs.service";
import { PageHeader } from "../_components/PageHeader";
import { OrgsTable } from "./_components/OrgsTable";

export default async function AdminOrgsPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  const initial = await searchOrganizations({ pageSize: 25 });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="admin.organizations.title"
        subtitleKey="admin.organizations.subtitle"
      />
      <OrgsTable initial={initial.data} initialCount={initial.count} />
    </div>
  );
}
