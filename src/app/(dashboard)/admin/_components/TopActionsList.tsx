"use client";

import { useTranslation } from "react-i18next";
import { formatInt } from "@/lib/format-number";

interface TopActionsListProps {
  actions: Array<{ action: string; count: number }>;
}

/** Horizontal bars for the most frequent audit actions in the window. */
export function TopActionsList({ actions }: TopActionsListProps) {
  const { t } = useTranslation();

  if (actions.length === 0) {
    return (
      <p className="text-neutral-soft text-sm">
        {t("admin.systemOverview.audit.emptyActions")}
      </p>
    );
  }

  const max = Math.max(1, ...actions.map((a) => a.count));

  return (
    <ul className="flex flex-col gap-2.5">
      {actions.map((a) => {
        const pct = Math.max(2, Math.round((a.count / max) * 100));
        return (
          <li key={a.action} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-sm">
              <code
                className="text-neutral-fg truncate font-mono text-xs"
                title={a.action}
              >
                {a.action}
              </code>
              <span className="text-brand-700 shrink-0 font-semibold">
                {formatInt(a.count)}
              </span>
            </div>
            <div className="bg-brand-50 h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-brand-500 h-full rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
