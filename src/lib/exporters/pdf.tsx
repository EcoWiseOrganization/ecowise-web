import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  ComplianceReportDocument,
  EmissionReportDocument,
  PersonalReportDocument,
} from "./pdf-templates";
import type {
  ComplianceReportData,
  EmissionReportData,
  PersonalReportData,
} from "@/types/report.types";

export async function buildEmissionReportPdf(
  data: EmissionReportData
): Promise<Buffer> {
  return await renderToBuffer(<EmissionReportDocument data={data} />);
}

export async function buildComplianceReportPdf(
  data: ComplianceReportData
): Promise<Buffer> {
  return await renderToBuffer(<ComplianceReportDocument data={data} />);
}

export async function buildPersonalReportPdf(
  data: PersonalReportData
): Promise<Buffer> {
  return await renderToBuffer(<PersonalReportDocument data={data} />);
}
