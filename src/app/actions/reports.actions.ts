"use server";

/**
 * Report export server actions (Phase 6 — UC-13, UC-27).
 * Returns base64-encoded payload + suggested filename so the browser can
 * trigger a download via a Blob URL. Compliance / org-summary exports also
 * mark logs in the period as Published (BR-07) and archive a copy to the
 * "report-archives" bucket.
 */

import { revalidatePath } from "next/cache";
import { requireOrgRole, requireSession, AuthError } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/service";
import { writeAuditLog } from "@/services/audit.service";
import {
  getOrgArchives,
  getOrgEmissionReportData,
  getPersonalReportData,
  markOrgLogsPublished,
  recordReportArchive,
} from "@/services/reports.service";
import { buildEmissionReportCsv } from "@/lib/exporters/csv";
import { buildEmissionReportXlsx } from "@/lib/exporters/xlsx";
import {
  buildComplianceReportPdf,
  buildEmissionReportPdf,
  buildPersonalReportPdf,
} from "@/lib/exporters/pdf";
import { buildGhgChecklist } from "@/lib/report-aggregator";
import type {
  ComplianceRegulation,
  ComplianceReportData,
  EmissionReportData,
  ReportArchive,
  ReportFormat,
  ReportLanguage,
  ReportPeriod,
} from "@/types/report.types";

const MIME_BY_FORMAT: Record<ReportFormat, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
};

interface ExportResult {
  filename: string;
  mimeType: string;
  base64: string;
  archiveId: string | null;
  totalCo2eKg: number;
  logCount: number;
  publishedCount: number;
}

function safeFilename(prefix: string, period: ReportPeriod, format: ReportFormat) {
  const stamp = `${period.start}_${period.end}`.replace(/[^0-9_-]/g, "");
  return `${prefix}_${stamp}.${format}`;
}

async function buildBuffer(opts: {
  format: ReportFormat;
  data: EmissionReportData;
  compliance?: ComplianceReportData;
}): Promise<Buffer> {
  if (opts.compliance && opts.format === "pdf") {
    return await buildComplianceReportPdf(opts.compliance);
  }
  if (opts.format === "pdf") return await buildEmissionReportPdf(opts.data);
  if (opts.format === "xlsx") return await buildEmissionReportXlsx(opts.data);
  return Buffer.from(buildEmissionReportCsv(opts.data), "utf8");
}

async function archive(opts: {
  buffer: Buffer;
  pathPrefix: string;
  filename: string;
  mimeType: string;
}): Promise<string> {
  const db = createServiceClient();
  const path = `${opts.pathPrefix}/${opts.filename}`;
  const { error } = await db.storage
    .from("report-archives")
    .upload(path, opts.buffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: opts.mimeType,
    });
  if (error) {
    console.error("[reports] archive upload failed", error.message);
  }
  return path;
}

// ── Org emission summary export ────────────────────────────────────────────

export async function exportOrgReportAction(opts: {
  orgId: string;
  period: ReportPeriod;
  format: ReportFormat;
  language?: ReportLanguage;
  publishLock?: boolean;
}): Promise<{ data: ExportResult | null; error: string | null }> {
  try {
    const ctx = await requireOrgRole(opts.orgId);
    const data = await getOrgEmissionReportData({
      orgId: opts.orgId,
      period: opts.period,
      language: opts.language ?? "en",
      generatedBy: ctx.userId,
    });

    const buffer = await buildBuffer({ format: opts.format, data });
    const filename = safeFilename(
      `emission_report_${data.org.legal_name.replace(/\s+/g, "_")}`,
      opts.period,
      opts.format
    );
    const mimeType = MIME_BY_FORMAT[opts.format];

    const path = await archive({
      buffer,
      pathPrefix: `${opts.orgId}/emission`,
      filename,
      mimeType,
    });

    let publishedCount = 0;
    if (opts.publishLock) {
      // Only Org Admin may lock reports.
      if (!ctx.isOrgAdmin) {
        return { data: null, error: "FORBIDDEN_ORG_ADMIN" };
      }
      publishedCount = await markOrgLogsPublished({
        orgId: opts.orgId,
        period: opts.period,
      });
    }

    const archiveId = await recordReportArchive({
      orgId: opts.orgId,
      kind: "emission_summary",
      format: opts.format,
      storage_path: path,
      period: opts.period,
      totalCo2eKg: data.summary.totalCo2eKg,
      logCount: data.summary.logCount,
      generatedBy: ctx.userId,
    });

    await writeAuditLog({
      action: "export_emission_report",
      resourceType: "report",
      resourceId: archiveId,
      orgId: opts.orgId,
      actorUserId: ctx.userId,
      newValue: {
        format: opts.format,
        period: opts.period,
        publishLock: Boolean(opts.publishLock),
        publishedCount,
      },
    });

    revalidatePath(`/dashboard/organization/${opts.orgId}/emission-logs/report`);

    return {
      data: {
        filename,
        mimeType,
        base64: buffer.toString("base64"),
        archiveId,
        totalCo2eKg: data.summary.totalCo2eKg,
        logCount: data.summary.logCount,
        publishedCount,
      },
      error: null,
    };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return {
      data: null,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

// ── Compliance export (UC-27) ──────────────────────────────────────────────

export async function exportComplianceReportAction(opts: {
  orgId: string;
  period: ReportPeriod;
  format: "pdf" | "xlsx";
  regulation: ComplianceRegulation;
  language?: ReportLanguage;
  publishLock?: boolean;
}): Promise<{ data: ExportResult | null; error: string | null }> {
  try {
    const ctx = await requireOrgRole(opts.orgId, { adminOnly: true });
    const base = await getOrgEmissionReportData({
      orgId: opts.orgId,
      period: opts.period,
      language: opts.language ?? "en",
      generatedBy: ctx.userId,
    });
    const checklist = buildGhgChecklist(base);
    const compliance: ComplianceReportData = {
      ...base,
      regulation: opts.regulation,
      checklist,
    };

    const buffer =
      opts.format === "pdf"
        ? await buildComplianceReportPdf(compliance)
        : await buildEmissionReportXlsx(base);

    const filename = safeFilename(
      `compliance_${opts.regulation}_${base.org.legal_name.replace(/\s+/g, "_")}`,
      opts.period,
      opts.format
    );
    const mimeType = MIME_BY_FORMAT[opts.format];

    const path = await archive({
      buffer,
      pathPrefix: `${opts.orgId}/compliance`,
      filename,
      mimeType,
    });

    let publishedCount = 0;
    if (opts.publishLock) {
      publishedCount = await markOrgLogsPublished({
        orgId: opts.orgId,
        period: opts.period,
      });
    }

    const archiveId = await recordReportArchive({
      orgId: opts.orgId,
      kind: "compliance",
      format: opts.format,
      storage_path: path,
      period: opts.period,
      totalCo2eKg: base.summary.totalCo2eKg,
      logCount: base.summary.logCount,
      generatedBy: ctx.userId,
    });

    await writeAuditLog({
      action: "export_compliance_report",
      resourceType: "report",
      resourceId: archiveId,
      orgId: opts.orgId,
      actorUserId: ctx.userId,
      newValue: {
        format: opts.format,
        regulation: opts.regulation,
        period: opts.period,
        publishLock: Boolean(opts.publishLock),
        publishedCount,
      },
    });

    revalidatePath(`/dashboard/organization/${opts.orgId}/compliance`);

    return {
      data: {
        filename,
        mimeType,
        base64: buffer.toString("base64"),
        archiveId,
        totalCo2eKg: base.summary.totalCo2eKg,
        logCount: base.summary.logCount,
        publishedCount,
      },
      error: null,
    };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return {
      data: null,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

// ── Personal export ────────────────────────────────────────────────────────

export async function exportPersonalReportAction(opts: {
  period: ReportPeriod;
  format: ReportFormat;
  language?: ReportLanguage;
}): Promise<{ data: ExportResult | null; error: string | null }> {
  try {
    const ctx = await requireSession();

    // Per seed plans (migration 012): `advanced_reports` is on B2C_PLUS
    // only — Free users get the in-app dashboard but not PDF/XLSX/CSV
    // exports. The gate is enforced server-side so a hand-crafted action
    // call can't bypass the UI.
    const { userHasFeature } = await import("@/lib/features");
    if (!(await userHasFeature(ctx.userId, "advanced_reports"))) {
      return { data: null, error: "PLAN_FEATURE_REQUIRED" };
    }

    const data = await getPersonalReportData({
      userId: ctx.userId,
      period: opts.period,
      language: opts.language ?? "en",
    });

    const buffer =
      opts.format === "pdf"
        ? await buildPersonalReportPdf(data)
        : opts.format === "xlsx"
          ? await buildEmissionReportXlsx(data)
          : Buffer.from(buildEmissionReportCsv(data), "utf8");

    const filename = safeFilename(
      `personal_report_${ctx.userId.slice(0, 8)}`,
      opts.period,
      opts.format
    );
    const mimeType = MIME_BY_FORMAT[opts.format];

    const path = await archive({
      buffer,
      pathPrefix: `personal/${ctx.userId}`,
      filename,
      mimeType,
    });

    const archiveId = await recordReportArchive({
      userId: ctx.userId,
      kind: "personal",
      format: opts.format,
      storage_path: path,
      period: opts.period,
      totalCo2eKg: data.summary.totalCo2eKg,
      logCount: data.summary.logCount,
      generatedBy: ctx.userId,
    });

    await writeAuditLog({
      action: "export_personal_report",
      resourceType: "report",
      resourceId: archiveId,
      actorUserId: ctx.userId,
      actorRole: "individual",
      newValue: { format: opts.format, period: opts.period },
    });

    return {
      data: {
        filename,
        mimeType,
        base64: buffer.toString("base64"),
        archiveId,
        totalCo2eKg: data.summary.totalCo2eKg,
        logCount: data.summary.logCount,
        publishedCount: 0,
      },
      error: null,
    };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return {
      data: null,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function listOrgArchivesAction(orgId: string): Promise<{
  data: ReportArchive[];
  error: string | null;
}> {
  try {
    await requireOrgRole(orgId);
    const data = (await getOrgArchives(orgId)) as ReportArchive[];
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}
