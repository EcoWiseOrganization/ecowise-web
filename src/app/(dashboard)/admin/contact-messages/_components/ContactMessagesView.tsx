"use client";

import { useState, useTransition } from "react";
import { setContactMessageStatusAction } from "@/app/actions/admin.actions";
import type { ContactMessageRow } from "@/types/admin.types";

const STATUS_OPTIONS: ContactMessageRow["status"][] = [
  "new",
  "read",
  "archived",
  "spam",
];

const STATUS_COLOR: Record<ContactMessageRow["status"], string> = {
  new: "bg-orange-50 text-orange-700",
  read: "bg-blue-50 text-blue-700",
  archived: "bg-gray-100 text-gray-600",
  spam: "bg-red-50 text-red-700",
};

export function ContactMessagesView({ initial }: { initial: ContactMessageRow[] }) {
  const [rows, setRows] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const updateStatus = (id: string, status: ContactMessageRow["status"]) => {
    setError(null);
    startTransition(async () => {
      const res = await setContactMessageStatusAction(id, status);
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {rows.length === 0 ? (
        <div className="bg-white border border-[#DAEDD5] rounded-2xl p-12 text-center text-sm text-[#6E726E]">
          No contact messages yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li
              key={m.id}
              className="bg-white border border-[#DAEDD5] rounded-2xl p-5 flex flex-col gap-2"
            >
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div>
                  <p className="font-semibold text-[#141514]">{m.name}</p>
                  <p className="text-xs text-[#6E726E]">{m.email}</p>
                  {m.subject && (
                    <p className="text-sm text-[#155A03] mt-1">{m.subject}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[m.status]}`}
                  >
                    {m.status}
                  </span>
                  <span className="text-xs text-[#AAAAAA]">
                    {new Date(m.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#3B3D3B] whitespace-pre-wrap">
                {m.message}
              </p>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                {STATUS_OPTIONS.filter((s) => s !== m.status).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateStatus(m.id, s)}
                    disabled={pending}
                    className="text-xs px-2 py-1 rounded-lg border border-[#E5E7EB] hover:bg-gray-50 disabled:opacity-50"
                  >
                    Mark {s}
                  </button>
                ))}
                <a
                  href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject ?? "")}`}
                  className="text-xs px-2 py-1 rounded-lg bg-[#155A03] text-white"
                >
                  Reply
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
