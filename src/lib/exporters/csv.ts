import Papa from "papaparse";
import type {
  EmissionReportData,
  PersonalReportData,
} from "@/types/report.types";

export function buildEmissionReportCsv(
  data: EmissionReportData | PersonalReportData
): string {
  const isOrg = "org" in data;
  const header: Record<string, string> = {
    "Generated at": data.generatedAt,
    "Period start": data.period.start,
    "Period end": data.period.end,
    "Total CO2e (kg)": String(data.summary.totalCo2eKg),
    "Scope 1 (kg)": String(data.summary.scope1Kg),
    "Scope 2 (kg)": String(data.summary.scope2Kg),
    "Scope 3 (kg)": String(data.summary.scope3Kg),
    "Log count": String(data.summary.logCount),
  };
  if (isOrg) {
    header["Organization"] = data.org.legal_name;
    header["Industry"] = data.org.industry ?? "";
  } else {
    const personal = data as PersonalReportData;
    header["User"] = personal.user.full_name ?? personal.user.email;
  }

  const headerLines = Object.entries(header)
    .map(([k, v]) => `"${k}","${(v ?? "").replace(/"/g, '""')}"`)
    .join("\n");

  const tableCsv = Papa.unparse(
    data.logs.map((l) => ({
      id: l.id,
      activity: l.activity_name,
      scope: l.scope,
      date: l.reporting_date,
      quantity: l.quantity,
      unit: l.unit,
      "co2e_kg": l.co2e_result,
      status: l.status,
      category: l.category ?? "",
      submitted_by: l.created_by_email ?? "",
    })),
    { quotes: true }
  );

  return `${headerLines}\n\n${tableCsv}`;
}
