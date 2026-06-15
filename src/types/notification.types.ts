/**
 * In-app notification types. The render text is NOT stored — only a stable
 * `type` key plus interpolation `data`. The header bell maps the type to an
 * i18n string so notifications stay fully translatable after the fact.
 */

export type NotificationType =
  | "plan_upgrade_requested"
  | "plan_upgrade_approved"
  | "plan_upgrade_rejected";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType | string;
  data: Record<string, string | number | null>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationFeed {
  items: AppNotification[];
  unreadCount: number;
}
