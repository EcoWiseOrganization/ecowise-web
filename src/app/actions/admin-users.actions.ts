"use server";

/**
 * System Admin actions for the users management screen.
 *
 * `exportAdminUsers` returns the full user table as a base64-encoded
 * xlsx/csv payload so the browser can trigger a download via Blob URL
 * (same pattern as the report exporters). Always writes an audit log
 * because dumping the entire user roster is a privileged action.
 */

import { requireSystemAdmin } from "@/lib/auth/roles";
import { writeAuditLog } from "@/services/audit.service";
import { listUsersForExport } from "@/services/user.service";
import {
  buildUsersCsv,
  buildUsersXlsx,
} from "@/lib/exporters/users-export";

export type AdminUsersExportFormat = "xlsx" | "csv";

interface ExportResult {
  filename: string;
  mimeType: string;
  base64: string;
  count: number;
}

const MIME_BY_FORMAT: Record<AdminUsersExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
};

export async function exportAdminUsers(
  format: AdminUsersExportFormat,
): Promise<ExportResult> {
  const ctx = await requireSystemAdmin();

  const users = await listUsersForExport();

  const buffer =
    format === "xlsx"
      ? await buildUsersXlsx(users)
      : Buffer.from(buildUsersCsv(users), "utf-8");

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `ecowise_users_${stamp}.${format}`;

  await writeAuditLog({
    actorUserId: ctx.userId,
    actorRole: "system_admin",
    action: "export_users",
    resourceType: "user",
    newValue: { format, count: users.length },
    status: "success",
  });

  return {
    filename,
    mimeType: MIME_BY_FORMAT[format],
    base64: buffer.toString("base64"),
    count: users.length,
  };
}
