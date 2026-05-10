import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { searchOrganizations } from "@/services/admin-orgs.service";
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
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="text-[#155A03] text-2xl font-bold">Organizations</h1>
        <p className="text-sm text-[#6E726E]">
          All organizations on the platform. Click an org for details and
          verification controls.
        </p>
      </div>
      <OrgsTable initial={initial.data} initialCount={initial.count} />
    </div>
  );
}
