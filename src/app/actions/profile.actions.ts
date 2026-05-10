"use server";

/**
 * Server actions for the profile screen (Phase 1).
 * All actions enforce session ownership — a user can only mutate their own
 * profile. Audit-log entries are emitted automatically by the User table
 * trigger installed in migration 006.
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireSession, AuthError } from "@/lib/auth/roles";
import {
  getFullProfile,
  getSustainabilityStats,
  updateProfile,
  isOnlyAdminOfAnyOrg,
  anonymizeAndDeleteAccount,
} from "@/services/user.service";
import { writeAuthAuditLog } from "@/services/audit.service";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isValidPasswordPolicy, isValidPhone } from "@/lib/profile";
import { MSG } from "@/lib/messages";
import type { SustainabilityStats, UpdateProfileInput, User } from "@/types/user.types";

async function ipAndUa() {
  try {
    const h = await headers();
    return {
      ipAddress:
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null,
      userAgent: h.get("user-agent") ?? null,
    };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

// ── Reads ─────────────────────────────────────────────────────────────────

export async function getMyProfileAction(): Promise<{
  data: { user: User | null; stats: SustainabilityStats | null };
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    const [user, stats] = await Promise.all([
      getFullProfile(ctx.userId),
      getSustainabilityStats(ctx.userId),
    ]);
    return { data: { user, stats }, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: { user: null, stats: null }, error: err.code };
    return {
      data: { user: null, stats: null },
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

// ── Update profile ────────────────────────────────────────────────────────

export async function updateMyProfileAction(
  input: UpdateProfileInput
): Promise<{ data: User | null; error: string | null }> {
  try {
    const ctx = await requireSession();
    if (input.phone !== undefined && !isValidPhone(input.phone)) {
      return { data: null, error: MSG.INVALID_FORMAT };
    }
    const updated = await updateProfile(ctx.userId, input);
    revalidatePath("/dashboard/settings/profile");
    return { data: updated, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return {
      data: null,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

// ── Change password ───────────────────────────────────────────────────────

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function changePasswordAction(
  input: ChangePasswordInput
): Promise<{ ok: boolean; error: string | null }> {
  const meta = await ipAndUa();
  try {
    const ctx = await requireSession();

    if (input.newPassword !== input.confirmPassword) {
      return { ok: false, error: MSG.PASSWORD_MISMATCH };
    }
    if (!isValidPasswordPolicy(input.newPassword)) {
      return { ok: false, error: MSG.PASSWORD_POLICY };
    }

    if (!ctx.email) {
      return { ok: false, error: MSG.PASSWORD_INCORRECT };
    }

    // Reauth: try sign-in with old password (does not affect current session
    // because supabase server client manages cookies separately).
    const supabase = await createClient();
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: ctx.email,
      password: input.oldPassword,
    });
    if (reauthErr) {
      await writeAuthAuditLog({
        action: "password_change",
        userId: ctx.userId,
        email: ctx.email,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        status: "failure",
        errorMessage: "old_password_incorrect",
      });
      return { ok: false, error: MSG.PASSWORD_INCORRECT };
    }

    // Update password.
    const { error: updateErr } = await supabase.auth.updateUser({
      password: input.newPassword,
    });
    if (updateErr) {
      await writeAuthAuditLog({
        action: "password_change",
        userId: ctx.userId,
        email: ctx.email,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        status: "failure",
        errorMessage: updateErr.message,
      });
      return { ok: false, error: updateErr.message };
    }

    await writeAuthAuditLog({
      action: "password_change",
      userId: ctx.userId,
      email: ctx.email,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      status: "success",
    });
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── Delete account (BR-02 + BR-26) ────────────────────────────────────────

export interface DeleteAccountInput {
  /** User must type their email exactly to confirm. */
  confirmEmail: string;
}

export async function deleteMyAccountAction(
  input: DeleteAccountInput
): Promise<{
  ok: boolean;
  error: string | null;
  blockedOrgIds?: string[];
}> {
  const meta = await ipAndUa();
  try {
    const ctx = await requireSession();
    if (!ctx.email || ctx.email.toLowerCase() !== input.confirmEmail.toLowerCase()) {
      return { ok: false, error: MSG.INVALID_FORMAT };
    }

    // BR-26: block if user is the only Org Admin in any org
    const guard = await isOnlyAdminOfAnyOrg(ctx.userId);
    if (guard.blocked) {
      await writeAuthAuditLog({
        action: "account_delete",
        userId: ctx.userId,
        email: ctx.email,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        status: "failure",
        errorMessage: "last_admin",
        extra: { blockedOrgIds: guard.orgIds },
      });
      return {
        ok: false,
        error: MSG.LAST_ADMIN_BLOCK,
        blockedOrgIds: guard.orgIds,
      };
    }

    // BR-02 anonymize
    await anonymizeAndDeleteAccount(ctx.userId);

    // Sign out current session (best effort)
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore — auth user already deleted
    }

    await writeAuthAuditLog({
      action: "account_delete",
      userId: ctx.userId,
      email: ctx.email,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      status: "success",
    });
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── Avatar upload ─────────────────────────────────────────────────────────

/**
 * Uploads an avatar image to the public "avatars" bucket and updates the
 * user's avatar_url. Caller must provide a binary (e.g. ArrayBuffer) since
 * server actions can accept FormData.
 */
export async function uploadAvatarAction(
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  try {
    const ctx = await requireSession();
    const file = formData.get("file") as File | null;
    if (!file) return { url: null, error: MSG.REQUIRED_FIELD };
    if (file.size > 2 * 1024 * 1024) return { url: null, error: MSG.FILE_TOO_LARGE };
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return { url: null, error: MSG.INVALID_FORMAT };

    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
    const path = `${ctx.userId}/${Date.now()}.${ext}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const db = createServiceClient();
    const { error: upErr } = await db.storage
      .from("avatars")
      .upload(path, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
    if (upErr) return { url: null, error: upErr.message };

    const { data } = db.storage.from("avatars").getPublicUrl(path);
    await updateProfile(ctx.userId, { avatar_url: data.publicUrl });
    revalidatePath("/dashboard/settings/profile");
    return { url: data.publicUrl, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { url: null, error: err.code };
    return { url: null, error: err instanceof Error ? err.message : "unknown" };
  }
}
