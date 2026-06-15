"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Fixed-position coords for the portal panel. The bell lives inside the
  // sidebar's `overflow-y-auto` container, so an absolutely-positioned
  // dropdown gets clipped to 222px — we render it in a body portal instead
  // and anchor it to the button's viewport rect.
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const reposition = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const gap = 8;
    const width = Math.min(320, window.innerWidth - gap * 2);
    // Anchor under the bell, but keep the panel fully inside the viewport.
    let left = r.left;
    left = Math.min(left, window.innerWidth - width - gap);
    left = Math.max(gap, left);
    setCoords({ top: r.bottom + gap, left, width });
  }, []);

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

  // Close on outside click (account for the portal panel living outside the
  // button's DOM subtree), and keep the panel anchored on scroll/resize.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onMove = () => reposition();
    document.addEventListener("mousedown", onClick);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, reposition]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      reposition();
      void load();
    }
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

  const panel =
    open && coords ? (
      <div
        ref={panelRef}
        role="dialog"
        aria-label={t("notif.title")}
        style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
        className="z-[1000] bg-white border border-[#DAEDD5] rounded-2xl shadow-[0_12px_40px_-8px_rgba(21,90,3,0.25)] overflow-hidden animate-fade-slide-up"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEF4EC] bg-[#F7FCF5]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#155A03]">
              {t("notif.title")}
            </span>
            {unread > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#1F8505] text-white text-[10px] font-bold leading-[18px] text-center">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
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

        <div className="max-h-[min(60vh,380px)] overflow-y-auto overscroll-contain">
          {loading && items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-[#AAAAAA]">
              {t("common.loading")}
            </p>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 flex flex-col items-center gap-2 text-center">
              <NotificationsNoneIcon sx={{ fontSize: 32, color: "#CFE3C8" }} />
              <p className="text-xs text-[#AAAAAA]">{t("notif.empty")}</p>
            </div>
          ) : (
            items.map((n) => {
              const { title, body } = describe(n, t);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onItemClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-[#F4F4F4] last:border-0 transition-colors cursor-pointer ${
                    n.read_at ? "bg-white hover:bg-gray-50" : "bg-[#F0FDF4] hover:bg-[#e7f8e1]"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-1.5 inline-block h-2 w-2 rounded-full flex-shrink-0 ${
                        n.read_at ? "bg-transparent" : "bg-[#1F8505]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#3B3D3B] leading-snug">
                        {title}
                      </p>
                      {body && (
                        <p className="text-xs text-[#6E726E] mt-0.5 leading-snug break-words">
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
    ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={t("notif.title")}
        aria-expanded={open}
        className="relative p-1.5 rounded-lg text-[#79B669] hover:bg-[#DAEDD5]/50 transition-colors bg-transparent border-none cursor-pointer"
      >
        <NotificationsNoneIcon sx={{ fontSize: 22 }} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-4 text-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </>
  );
}
