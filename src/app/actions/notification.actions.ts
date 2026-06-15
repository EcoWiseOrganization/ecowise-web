"use server";

/**
 * Notification server actions. Reads/writes are always scoped to the
 * authenticated caller — the service layer takes the resolved user id so a
 * caller can never touch another user's notifications.
 */

import { AuthError, requireSession } from "@/lib/auth/roles";
import {
  getNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notification.service";
import type { NotificationFeed } from "@/types/notification.types";

export async function getMyNotificationFeedAction(): Promise<{
  data: NotificationFeed;
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    const data = await getNotificationFeed(ctx.userId);
    return { data, error: null };
  } catch (err) {
    const empty: NotificationFeed = { items: [], unreadCount: 0 };
    if (err instanceof AuthError) return { data: empty, error: err.code };
    return { data: empty, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function markNotificationReadAction(
  notificationId: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireSession();
    await markNotificationRead(ctx.userId, notificationId);
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function markAllNotificationsReadAction(): Promise<{
  ok: boolean;
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    await markAllNotificationsRead(ctx.userId);
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
