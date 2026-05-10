import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { searchAuditLogs } from "@/services/audit.service";
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
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="text-[#155A03] text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-[#6E726E]">
          Immutable record of every critical action (BR-16).
        </p>
      </div>
      <AuditLogTable initial={initial.data} initialCount={initial.count} />
    </div>
  );
}
