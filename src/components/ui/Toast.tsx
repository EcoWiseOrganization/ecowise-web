"use client";

/**
 * Toast.tsx — Lightweight global toast notification system.
 *
 * Usage:
 *   1. Wrap your app (or layout) with <ToastProvider>.
 *   2. Call const { showToast } = useToast() inside any client component.
 *   3. showToast("Message", "success" | "error" | "info")
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";
import CloseIcon from "@mui/icons-material/Close";

// ── Types ────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ── Context ──────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

// ── Single Toast item ────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircleIcon sx={{ fontSize: 20, color: "#1F8505" }} />,
  error: <ErrorIcon sx={{ fontSize: 20, color: "#DC2626" }} />,
  info: <InfoIcon sx={{ fontSize: 20, color: "#2563EB" }} />,
};

const BORDER_COLOR: Record<ToastType, string> = {
  success: "border-[#DAEDD5]",
  error: "border-red-200",
  info: "border-blue-200",
};

const TEXT_COLOR: Record<ToastType, string> = {
  success: "text-[#155A03]",
  error: "text-red-700",
  info: "text-blue-700",
};

const DISMISS_MS = 4000;

function ToastItem({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger entrance animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => onDismiss(item.id), DISMISS_MS);
    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.id, onDismiss]);

  return (
    <div
      className={`
        flex items-start gap-3 w-full max-w-sm px-4 py-3 bg-white rounded-xl
        border shadow-[0_4px_16px_rgba(0,0,0,0.10)]
        transition-all duration-300
        ${BORDER_COLOR[item.type]}
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
      `}
    >
      <span className="mt-0.5 shrink-0">{ICONS[item.type]}</span>
      <p className={`flex-1 text-sm font-medium leading-5 ${TEXT_COLOR[item.type]}`}>
        {item.message}
      </p>
      <button
        onClick={() => onDismiss(item.id)}
        className="mt-0.5 shrink-0 text-[#AAAAAA] hover:text-[#3B3D3B] bg-transparent border-none cursor-pointer p-0"
        aria-label="Dismiss"
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </button>
    </div>
  );
}

// ── Provider ─────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm">
            <ToastItem item={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
