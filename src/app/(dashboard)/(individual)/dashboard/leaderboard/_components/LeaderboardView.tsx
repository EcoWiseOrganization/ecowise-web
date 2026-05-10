"use client";

import { useState, useTransition } from "react";
import { getLeaderboardAction } from "@/app/actions/gamification.actions";
import type { LeaderboardRow } from "@/types/gamification.types";

const WINDOWS = ["all", "month", "week"] as const;
type Window = (typeof WINDOWS)[number];

export function LeaderboardView({ initial }: { initial: LeaderboardRow[] }) {
  const [rows, setRows] = useState<LeaderboardRow[]>(initial);
  const [windowSel, setWindowSel] = useState<Window>("all");
  const [pending, startTransition] = useTransition();

  const switchWindow = (next: Window) => {
    setWindowSel(next);
    if (next === "all") {
      setRows(initial);
      return;
    }
    startTransition(async () => {
      const res = await getLeaderboardAction(next);
      setRows(res.data);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex border border-[#DAEDD5] rounded-lg overflow-hidden self-start">
        {WINDOWS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => switchWindow(w)}
            className={`px-4 py-2 text-sm capitalize ${
              windowSel === w
                ? "bg-[#155A03] text-white"
                : "bg-white text-[#6E726E]"
            }`}
          >
            {w === "all" ? "All time" : w === "month" ? "This month" : "This week"}
          </button>
        ))}
      </div>

      {pending && rows.length === 0 ? (
        <p className="text-sm text-[#AAAAAA]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[#AAAAAA]">No activity in this window.</p>
      ) : (
        <ul className="bg-white border border-[#DAEDD5] rounded-2xl divide-y divide-gray-100">
          {rows.map((r) => (
            <li
              key={r.user_id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    r.rank === 1
                      ? "bg-yellow-100 text-yellow-700"
                      : r.rank === 2
                        ? "bg-gray-200 text-gray-700"
                        : r.rank === 3
                          ? "bg-orange-100 text-orange-700"
                          : "bg-[#F0FDF4] text-[#1F8505]"
                  }`}
                >
                  {r.rank}
                </span>
                <div>
                  <p className="font-medium text-[#141514]">{r.display_name}</p>
                  <p className="text-xs text-[#AAAAAA]">{r.email}</p>
                </div>
              </div>
              <span className="text-[#1F8505] font-semibold">
                {r.total_points} pts
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
