/**
 * Build the System Admin "all users" export in either Excel (.xlsx) or CSV.
 * Used by `exportAdminUsers` server action — never call from the client.
 */

import ExcelJS from "exceljs";
import Papa from "papaparse";
import type { AdminUserExportRow } from "@/services/user.service";

const COLUMNS = [
  { header: "ID", key: "id", width: 38 },
  { header: "Email", key: "email", width: 32 },
  { header: "Full name", key: "full_name", width: 26 },
  { header: "Username", key: "user_name", width: 20 },
  { header: "Phone", key: "phone", width: 16 },
  { header: "Role", key: "role", width: 12 },
  { header: "Status", key: "status", width: 12 },
  { header: "Green points", key: "green_points", width: 14 },
  { header: "Joined", key: "created_at", width: 22 },
  { header: "Last login", key: "last_login_at", width: 22 },
] as const;

/** Normalised plain object — one row per user. Shared by xlsx + csv paths. */
function rowToRecord(u: AdminUserExportRow) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name ?? "",
    user_name: u.user_name ?? "",
    phone: u.phone ?? "",
    role: u.is_admin ? "Admin" : "User",
    status: u.status,
    green_points: u.green_points,
    created_at: u.created_at,
    last_login_at: u.last_login_at ?? "",
  };
}

export async function buildUsersXlsx(
  users: AdminUserExportRow[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "EcoWise";
  wb.created = new Date();

  const ws = wb.addWorksheet("Users");
  ws.columns = COLUMNS.map((c) => ({ ...c }));

  ws.addRows(users.map(rowToRecord));

  // Style the header row to match the brand without doing anything fancy.
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FF155A03" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDAEDD5" },
  };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function buildUsersCsv(users: AdminUserExportRow[]): string {
  return Papa.unparse(
    {
      fields: COLUMNS.map((c) => c.key),
      data: users.map((u) => {
        const r = rowToRecord(u);
        return COLUMNS.map((c) => r[c.key]);
      }),
    },
    { quotes: true },
  );
}
