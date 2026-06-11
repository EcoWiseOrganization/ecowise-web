import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { searchAuditLogs } from "@/services/audit.service";
import { PageHeader } from "../_components/PageHeader";
import { AuditLogTable } from "./_components/AuditLogTable";

export default async function AuditLogsPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  const initial = await searchAuditLogs({ pageSize: 25 });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="admin.auditLogs.title"
        subtitleKey="admin.auditLogs.subtitle"
      />
      <AuditLogTable initial={initial.data} initialCount={initial.count} />
    </div>
  );
}
