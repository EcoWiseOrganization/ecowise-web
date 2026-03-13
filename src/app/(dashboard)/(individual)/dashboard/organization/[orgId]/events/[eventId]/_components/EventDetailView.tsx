"use client";

import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CategoryIcon from "@mui/icons-material/Category";
import type { Event } from "@/types/database.types";

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-[#f0f9ed] text-[#1F8505] border-[#DAEDD5]",
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-gray-100 text-gray-600 border-gray-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {status}
    </span>
  );
}

interface EventDetailViewProps {
  event: Event;
}

export function EventDetailView({ event }: EventDetailViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-[#DAEDD5] px-6 py-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[#141514] text-xl font-bold">{event.name}</h1>
              <StatusBadge status={event.status} />
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[#AAAAAA] text-sm">
                <CategoryIcon sx={{ fontSize: 14 }} />
                <span>{event.event_type}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#AAAAAA] text-sm">
                <CalendarTodayIcon sx={{ fontSize: 14 }} />
                <span>{event.start_date} → {event.end_date}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
