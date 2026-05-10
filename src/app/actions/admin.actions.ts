"use server";

import { revalidatePath } from "next/cache";
import { AuthError, requireSystemAdmin } from "@/lib/auth/roles";
import { writeAuditLog } from "@/services/audit.service";
import {
  getEmissionsBySector,
  getGrowthTrends,
  getPlatformMetrics,
} from "@/services/admin-metrics.service";
import {
  getAdminOrgDetail,
  listContactMessages,
  searchOrganizations,
  setContactMessageStatus,
  setOrgVerificationStatus,
  type OrgSearchFilters,
} from "@/services/admin-orgs.service";
import type {
  AdminOrganizationDetail,
  AdminOrganizationRow,
  ContactMessageRow,
  GrowthBucket,
  PlatformMetrics,
  SectorTotal,
} from "@/types/admin.types";

export async function getPlatformMetricsAction(): Promise<{
  data: PlatformMetrics | null;
  error: string | null;
}> {
  try {
    await requireSystemAdmin();
    return { data: await getPlatformMetrics(), error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function getGrowthTrendsAction(months = 12): Promise<{
  data: GrowthBucket[];
  error: string | null;
}> {
  try {
    await requireSystemAdmin();
    return { data: await getGrowthTrends(months), error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function getEmissionsBySectorAction(): Promise<{
  data: SectorTotal[];
  error: string | null;
}> {
  try {
    await requireSystemAdmin();
    return { data: await getEmissionsBySector(), error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function searchOrganizationsAction(
  filters: OrgSearchFilters
): Promise<{
  data: AdminOrganizationRow[];
  count: number;
  error: string | null;
}> {
  try {
    await requireSystemAdmin();
    const r = await searchOrganizations(filters);
    return { ...r, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], count: 0, error: err.code };
    return {
      data: [],
      count: 0,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function getAdminOrgDetailAction(orgId: string): Promise<{
  data: AdminOrganizationDetail | null;
  error: string | null;
}> {
  try {
    await requireSystemAdmin();
    const data = await getAdminOrgDetail(orgId);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function setOrgVerificationStatusAction(
  orgId: string,
  status: "Pending" | "Verified" | "Suspended"
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireSystemAdmin();
    await setOrgVerificationStatus(orgId, status);
    await writeAuditLog({
      action: "org_verification_status_changed",
      resourceType: "organization",
      resourceId: orgId,
      orgId,
      actorUserId: ctx.userId,
      newValue: { status },
    });
    revalidatePath("/admin/organizations");
    revalidatePath(`/admin/organizations/${orgId}`);
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function listContactMessagesAction(): Promise<{
  data: ContactMessageRow[];
  error: string | null;
}> {
  try {
    await requireSystemAdmin();
    const data = await listContactMessages();
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function setContactMessageStatusAction(
  id: string,
  status: ContactMessageRow["status"]
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireSystemAdmin();
    await setContactMessageStatus(id, status);
    await writeAuditLog({
      action: "contact_message_status_changed",
      resourceType: "contact_message",
      resourceId: id,
      actorUserId: ctx.userId,
      newValue: { status },
    });
    revalidatePath("/admin/contact-messages");
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
