import ExcelJS from "exceljs";
import type {
  EmissionReportData,
  PersonalReportData,
} from "@/types/report.types";

export async function buildEmissionReportXlsx(
  data: EmissionReportData | PersonalReportData
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "EcoWise";
  wb.created = new Date();

  // ── Sheet 1: Summary ────────────────────────────────────────────────────
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Metric", key: "k", width: 30 },
    { header: "Value", key: "v", width: 30 },
  ];

  const isOrg = "org" in data;
  const subjectLabel = isOrg
    ? (data as EmissionReportData).org.legal_name
    : (data as PersonalReportData).user.full_name ??
      (data as PersonalReportData).user.email;

  summary.addRows([
    { k: isOrg ? "Organization" : "User", v: subjectLabel },
    { k: "Period", v: `${data.period.start} → ${data.period.end}` },
    { k: "Generated at", v: data.generatedAt },
    { k: "Total CO2e (kg)", v: data.summary.totalCo2eKg },
    { k: "Scope 1 (kg)", v: data.summary.scope1Kg },
    { k: "Scope 2 (kg)", v: data.summary.scope2Kg },
    { k: "Scope 3 (kg)", v: data.summary.scope3Kg },
    { k: "Log count", v: data.summary.logCount },
  ]);

  if (isOrg) {
    summary.addRows([
      { k: "Verified count", v: (data as EmissionReportData).summary.verifiedCount },
      { k: "Pending count", v: (data as EmissionReportData).summary.pendingCount },
      { k: "Completeness (%)", v: (data as EmissionReportData).summary.completenessPct },
    ]);
  }

  summary.getRow(1).font = { bold: true };

  // ── Sheet 2: Monthly trend ─────────────────────────────────────────────
  const trend = wb.addWorksheet("MonthlyTrend");
  trend.columns = [
    { header: "Month", key: "month", width: 12 },
    { header: "Total CO2e (kg)", key: "total", width: 18 },
    { header: "Log count", key: "count", width: 12 },
  ];
  trend.addRows(
    data.monthlyTrend.map((m) => ({
      month: m.month,
      total: m.total_co2e_kg,
      count: m.log_count,
    }))
  );
  trend.getRow(1).font = { bold: true };

  // ── Sheet 3: Categories ────────────────────────────────────────────────
  const cats = wb.addWorksheet("Categories");
  cats.columns = [
    { header: "Category", key: "name", width: 30 },
    { header: "CO2e (kg)", key: "co2", width: 18 },
    { header: "Share %", key: "share", width: 10 },
  ];
  cats.addRows(
    data.byCategory.map((c) => ({
      name: c.name,
      co2: c.co2e_kg,
      share: c.share_pct,
    }))
  );
  cats.getRow(1).font = { bold: true };

  // ── Sheet 4: Logs ──────────────────────────────────────────────────────
  const logs = wb.addWorksheet("Logs");
  logs.columns = [
    { header: "Activity", key: "activity", width: 30 },
    { header: "Scope", key: "scope", width: 10 },
    { header: "Date", key: "date", width: 12 },
    { header: "Quantity", key: "qty", width: 12 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "CO2e (kg)", key: "co2", width: 14 },
    { header: "Status", key: "status", width: 12 },
    { header: "Category", key: "cat", width: 25 },
    { header: "Submitted by", key: "by", width: 30 },
  ];
  logs.addRows(
    data.logs.map((l) => ({
      activity: l.activity_name,
      scope: l.scope,
      date: l.reporting_date,
      qty: l.quantity,
      unit: l.unit,
      co2: l.co2e_result,
      status: l.status,
      cat: l.category ?? "",
      by: l.created_by_email ?? "",
    }))
  );
  logs.getRow(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
