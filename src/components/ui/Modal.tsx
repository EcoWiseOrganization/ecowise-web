"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

interface ModalProps {
  open: boolean;
  /** Called when user dismisses via backdrop click, Esc, or close button. */
  onClose: () => void;
  /** Screen-reader label for the dialog. Required for `aria-labelledby`
   *  / aria-modal compliance. Use a short title-like string. */
  ariaLabel: string;
  children: ReactNode;
  /** Optional extra Tailwind classes for the inner panel. */
  className?: string;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Accessible modal primitive.
 *
 * - `role="dialog"` + `aria-modal="true"` + `aria-label`.
 * - Esc closes; the previously-focused element regains focus on close.
 * - Backdrop click closes (clicks inside the panel don't bubble).
 * - On open we focus the first focusable element inside (input, button,
 *   etc.) — falls back to the panel itself so screen readers anchor.
 * - Tab cycles within the panel (basic focus trap). Shift+Tab wraps the
 *   other way.
 *
 * Replaces a handful of ad-hoc `fixed inset-0` overlays scattered
 * across the dashboard that REVIEW.md flagged for missing the above.
 */
export function Modal({
  open,
  onClose,
  ariaLabel,
  children,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    // Defer one frame so the panel mounted and refs settled before we
    // hunt for the first focusable.
    const id = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? panel).focus();
    });
    document.addEventListener("keydown", handleKey);
    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener("keydown", handleKey);
      const prev = previouslyFocused.current as HTMLElement | null;
      prev?.focus?.();
    };
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        ref={panelRef}
        // -1 so the panel itself is focus-trappable as a fallback.
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={
          className ??
          "bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6 relative outline-none"
        }
      >
        {children}
      </div>
    </div>
  );
}
