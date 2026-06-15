/**
 * Server-only notification service. Writes go through the service-role
 * client (RLS only grants users SELECT/UPDATE on their own rows), reads are
 * scoped to a single user id resolved by the calling action.
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  AppNotification,
  NotificationFeed,
  NotificationType,
} from "@/types/notification.types";

const MAX_FEED = 30;

/** Insert a notification for a single user. Best-effort: a failure here must
 *  never break the originating mutation (e.g. an upgrade approval), so the
 *  caller wraps it and swallows errors. */
export async function createNotification(opts: {
  userId: string;
  type: NotificationType;
  data?: Record<string, string | number | null>;
}): Promise<AppNotification | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("Notifications")
    .insert({
      user_id: opts.userId,
      type: opts.type,
      data: opts.data ?? {},
    })
    .select()
    .single();
  if (error) {
    console.error("[notification.service] createNotification failed", error);
    return null;
  }
  return data as AppNotification;
}

/** Latest notifications + unread count for the bell dropdown. */
export async function getNotificationFeed(
  userId: string
): Promise<NotificationFeed> {
  const db = createServiceClient();
  const [{ data: items }, { count }] = await Promise.all([
    db
      .from("Notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_FEED),
    db
      .from("Notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);
  return {
    items: (items ?? []) as AppNotification[],
    unreadCount: count ?? 0,
  };
}

/** Mark a single notification read (no-op if it isn't the user's). */
export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  const db = createServiceClient();
  await db
    .from("Notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null);
}

/** Mark every unread notification for the user as read. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const db = createServiceClient();
  await db
    .from("Notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}
