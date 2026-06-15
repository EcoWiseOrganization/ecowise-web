/**
 * Build the "subscribed users" export (Excel / CSV) with full payment info.
 * Used by the `exportSubscribedUsers` server action — server-only.
 */

import ExcelJS from "exceljs";
import Papa from "papaparse";
import type { SubscribedUserRow } from "@/services/subscription.service";

const COLUMNS = [
  { header: "Full name", key: "full_name", width: 24 },
  { header: "Username", key: "user_name", width: 18 },
  { header: "Email", key: "email", width: 30 },
  { header: "Plan", key: "plan_name", width: 24 },
  { header: "Billing cycle", key: "billing_cycle", width: 14 },
  { header: "Status", key: "status", width: 12 },
  { header: "Amount", key: "amount", width: 16 },
  { header: "Currency", key: "currency", width: 10 },
  { header: "Period start", key: "period_start", width: 14 },
  { header: "Period end", key: "period_end", width: 14 },
  { header: "Auto-renew", key: "auto_renew", width: 12 },
  { header: "Invoice #", key: "invoice_number", width: 22 },
  { header: "Paid at", key: "paid_at", width: 22 },
  { header: "Subscribed at", key: "subscribed_at", width: 22 },
] as const;

const dateOnly = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

/** Normalised plain object — one row per subscribed user. */
function rowToRecord(r: SubscribedUserRow) {
  return {
    full_name: r.full_name ?? "",
    user_name: r.user_name ?? "",
    email: r.email ?? "",
    plan_name: r.plan_name,
    billing_cycle: r.billing_cycle,
    status: r.status,
    amount: r.amount,
    currency: r.currency,
    period_start: dateOnly(r.current_period_start),
    // Lifetime parks period_end a century out — show a label instead.
    period_end: r.billing_cycle === "Lifetime" ? "Lifetime" : dateOnly(r.current_period_end),
    auto_renew: r.auto_renew ? "Yes" : "No",
    invoice_number: r.invoice_number ?? "",
    paid_at: r.invoice_paid_at ? r.invoice_paid_at.slice(0, 19).replace("T", " ") : "",
    subscribed_at: r.subscribed_at.slice(0, 19).replace("T", " "),
  };
}

export async function buildSubscribedUsersXlsx(
  rows: SubscribedUserRow[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "EcoWise";
  wb.created = new Date();

  const ws = wb.addWorksheet("Subscribed users");
  ws.columns = COLUMNS.map((c) => ({ ...c }));
  ws.addRows(rows.map(rowToRecord));

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

export function buildSubscribedUsersCsv(rows: SubscribedUserRow[]): string {
  return Papa.unparse(
    {
      fields: COLUMNS.map((c) => c.key),
      data: rows.map((r) => {
        const rec = rowToRecord(r);
        return COLUMNS.map((c) => rec[c.key as keyof typeof rec]);
      }),
    },
    { quotes: true }
  );
}
