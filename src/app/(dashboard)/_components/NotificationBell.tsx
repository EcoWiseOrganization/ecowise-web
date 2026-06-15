"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import {
  getMyNotificationFeedAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notification.actions";
import type { AppNotification } from "@/types/notification.types";

const POLL_MS = 60_000;

/** Maps a notification to display text + an optional deep link. Text comes
 *  from i18n keys so notifications stay translatable after they're stored. */
function describe(
  n: AppNotification,
  t: (k: string, opts?: Record<string, unknown>) => string
): { title: string; body: string; href: string | null } {
  const d = n.data ?? {};
  switch (n.type) {
    case "plan_upgrade_approved":
      return {
        title: t("notif.plan_upgrade_approved.title"),
        body: t("notif.plan_upgrade_approved.body", {
          planName: d.planName ?? "",
          nextBilling: d.nextBilling ?? "",
        }),
        href: "/dashboard/billing",
      };
    case "plan_upgrade_rejected":
      return {
        title: t("notif.plan_upgrade_rejected.title"),
        body: d.reason
          ? t("notif.plan_upgrade_rejected.bodyReason", {
              planName: d.planName ?? "",
              reason: d.reason,
            })
          : t("notif.plan_upgrade_rejected.body", { planName: d.planName ?? "" }),
        href: "/dashboard/billing",
      };
    default:
      return { title: n.type, body: "", href: null };
  }
}

function useRelativeTime() {
  const { i18n } = useTranslation();
  return useCallback(
    (iso: string): string => {
      const diffMs = Date.now() - new Date(iso).getTime();
      const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: "auto" });
      const mins = Math.round(diffMs / 60000);
      if (Math.abs(mins) < 60) return rtf.format(-mins, "minute");
      const hours = Math.round(mins / 60);
      if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
      const days = Math.round(hours / 24);
      return rtf.format(-days, "day");
    },
    [i18n.language]
  );
}

export function NotificationBell() {
  const { t } = useTranslation();
  const router = useRouter();
  const relative = useRelativeTime();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getMyNotificationFeedAction();
    if (!res.error) {
      setItems(res.data.items);
      setUnread(res.data.unreadCount);
    }
    setLoading(false);
  }, []);

  // Initial load + lightweight polling so the badge updates after an admin
  // approves an upgrade without a full page reload.
  useEffect(() => {
    // `load()` flips a loading flag synchronously; that's the intended
    // fetch-on-mount behaviour, not the cascading-render anti-pattern the
    // rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) void load();
  };

  const onItemClick = async (n: AppNotification) => {
    const { href } = describe(n, t);
    if (!n.read_at) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x
        )
      );
      setUnread((u) => Math.max(0, u - 1));
      await markNotificationReadAction(n.id);
    }
    if (href) {
      setOpen(false);
      router.push(href);
    }
  };

  const markAll = async () => {
    setItems((prev) =>
      prev.map((x) => (x.read_at ? x : { ...x, read_at: new Date().toISOString() }))
    );
    setUnread(0);
    await markAllNotificationsReadAction();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={t("notif.title")}
        className="relative p-1.5 rounded-lg text-[#79B669] hover:bg-[#DAEDD5]/50 transition-colors bg-transparent border-none cursor-pointer"
      >
        <NotificationsNoneIcon sx={{ fontSize: 22 }} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-4 text-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[300px] max-w-[80vw] bg-white border border-[#DAEDD5] rounded-2xl shadow-xl z-[60] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0]">
            <span className="text-sm font-bold text-[#155A03]">
              {t("notif.title")}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="flex items-center gap-1 text-xs text-[#1F8505] hover:underline bg-transparent border-none cursor-pointer"
              >
                <DoneAllIcon sx={{ fontSize: 15 }} />
                {t("notif.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#AAAAAA]">
                {t("common.loading")}
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-[#AAAAAA]">
                {t("notif.empty")}
              </p>
            ) : (
              items.map((n) => {
                const { title, body } = describe(n, t);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onItemClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-[#F7F7F7] last:border-0 transition-colors cursor-pointer ${
                      n.read_at ? "bg-white hover:bg-gray-50" : "bg-[#F0FDF4] hover:bg-[#e7f8e1]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at && (
                        <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-[#1F8505] flex-shrink-0" />
                      )}
                      <div className={n.read_at ? "pl-4" : ""}>
                        <p className="text-sm font-semibold text-[#3B3D3B] leading-snug">
                          {title}
                        </p>
                        {body && (
                          <p className="text-xs text-[#6E726E] mt-0.5 leading-snug">
                            {body}
                          </p>
                        )}
                        <p className="text-[10px] text-[#AAAAAA] mt-1">
                          {relative(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
