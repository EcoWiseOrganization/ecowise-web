"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

interface GlobalLoadingCtx {
  start: () => void;
  done: () => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingCtx>({
  start: () => {},
  done: () => {},
});

export const useGlobalLoading = () => useContext(GlobalLoadingContext);

const NAV_SAFETY_TIMEOUT_MS = 8000;
const TAP_FEEDBACK_MS = 600;
const TICK_MS = 250;
const HIDE_MS = 350;

export function GlobalLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDoneRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef(false);

  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (autoDoneRef.current) clearTimeout(autoDoneRef.current);
    intervalRef.current = null;
    hideTimerRef.current = null;
    autoDoneRef.current = null;
  };

  const start = useCallback(() => {
    clearTimers();
    visibleRef.current = true;
    setVisible(true);
    setProgress(8);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const inc = p < 30 ? 6 : p < 60 ? 3 : p < 80 ? 1.5 : 0.5;
        return Math.min(p + inc, 90);
      });
    }, TICK_MS);
  }, []);

  const done = useCallback(() => {
    if (!visibleRef.current) return;
    clearTimers();
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
      setProgress(0);
    }, HIDE_MS);
  }, []);

  // Auto-complete when the route actually changes.
  useEffect(() => {
    done();
  }, [pathname, done]);

  // Auto-start on link / button clicks anywhere in the document.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest(
        "a, button, [role='button']"
      ) as HTMLElement | null;
      if (!el) return;
      if (
        el.hasAttribute("disabled") ||
        el.getAttribute("aria-disabled") === "true"
      ) {
        return;
      }

      if (el.tagName === "A") {
        const a = el as HTMLAnchorElement;
        const href = a.getAttribute("href");
        if (
          !href ||
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:")
        ) {
          return;
        }
        if (a.target && a.target !== "" && a.target !== "_self") return;
        try {
          const url = new URL(href, window.location.href);
          if (url.origin !== window.location.origin) return;
          if (
            url.pathname === window.location.pathname &&
            url.search === window.location.search
          ) {
            return;
          }
        } catch {
          return;
        }
        start();
        autoDoneRef.current = setTimeout(done, NAV_SAFETY_TIMEOUT_MS);
        return;
      }

      // Plain button / role=button — quick tap feedback.
      start();
      autoDoneRef.current = setTimeout(done, TAP_FEEDBACK_MS);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [start, done]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  return (
    <GlobalLoadingContext.Provider value={{ start, done }}>
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 300ms ease 80ms",
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-[#79B669] to-[#1F8505] shadow-[0_0_10px_rgba(31,133,5,0.65)]"
          style={{
            width: `${progress}%`,
            transition: "width 250ms ease-out",
          }}
        />
      </div>
      {children}
    </GlobalLoadingContext.Provider>
  );
}
