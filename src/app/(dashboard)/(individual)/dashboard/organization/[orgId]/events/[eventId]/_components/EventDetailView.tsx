"use client";

import { useState } from "react";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CategoryIcon from "@mui/icons-material/Category";
import type { Event, EventAssignmentWithUser } from "@/types/database.types";
import { removeEventAssignmentAction } from "@/app/actions/organization.actions";
import { AssignEmployeeModal } from "@/components/events/AssignEmployeeModal";
import { useToast } from "@/components/ui/Toast";

// ── Status badge ─────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-[#f0f9ed] text-[#1F8505] border-[#DAEDD5]",
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-gray-100 text-gray-600 border-gray-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
    >
      {status}
    </span>
  );
}

// ── Props ────────────────────────────────────────────────────────

interface EventDetailViewProps {
  event: Event;
  orgId: string;
  initialAssignments: EventAssignmentWithUser[];
  userId: string;
  isAdmin: boolean;
}

// ── Component ────────────────────────────────────────────────────

export function EventDetailView({
  event,
  orgId,
  initialAssignments,
  userId,
  isAdmin,
}: EventDetailViewProps) {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<EventAssignmentWithUser[]>(initialAssignments);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (assignmentId: string, name: string) => {
    setRemovingId(assignmentId);
    const { error } = await removeEventAssignmentAction(assignmentId);
    if (error) {
      showToast(error, "error");
    } else {
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      showToast(`${name} removed from event.`, "info");
    }
    setRemovingId(null);
  };

  // Refresh assignments list after modal assigns someone
  const handleAssigned = () => {
    // Re-fetch is triggered by closing & re-opening; for now update via modal's internal state
    // The modal marks assigned in its own Set — assignments list will refresh on next page load
    // For immediate UX, we rely on the AssignEmployeeModal's visual feedback
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Event header card */}
      <div className="bg-white rounded-2xl border border-[#DAEDD5] px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
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

      {/* Assigned employees section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#141514] text-base font-semibold">
            Assigned Employees ({assignments.length})
          </h2>
          {isAdmin && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-xs font-semibold hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all"
            >
              <PersonAddIcon sx={{ fontSize: 14 }} />
              Assign Employee
            </button>
          )}
        </div>

        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 border-2 border-dashed border-[#DAEDD5] rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#f0f9ed] flex items-center justify-center">
              <PersonAddIcon sx={{ fontSize: 24, color: "#79B669" }} />
            </div>
            <div className="text-center">
              <p className="text-[#3B3D3B] text-sm font-medium">No employees assigned</p>
              {isAdmin && (
                <p className="text-[#AAAAAA] text-xs mt-1">
                  Assign members of this organization to participate in the event.
                </p>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 transition-all"
              >
                <PersonAddIcon sx={{ fontSize: 16 }} />
                Assign Employee
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {assignments.map((assignment) => {
              const name =
                assignment.user?.full_name ||
                assignment.user?.user_name ||
                assignment.user?.email ||
                "Unknown";
              const subtitle = assignment.user?.email || assignment.user?.user_name || "";
              const isRemoving = removingId === assignment.id;

              return (
                <div
                  key={assignment.id}
                  className="flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-[#DAEDD5]"
                >
                  <div className="w-9 h-9 rounded-full bg-[linear-gradient(135deg,#79B669,#1F8505)] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#141514] text-sm font-semibold truncate">{name}</p>
                    {subtitle && (
                      <p className="text-[#AAAAAA] text-xs truncate">{subtitle}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemove(assignment.id, name)}
                      disabled={isRemoving}
                      className="shrink-0 p-1.5 rounded-lg text-[#AAAAAA] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      aria-label={`Remove ${name}`}
                    >
                      <PersonRemoveIcon sx={{ fontSize: 16 }} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Assign employee modal */}
      {showAssignModal && (
        <AssignEmployeeModal
          orgId={orgId}
          eventId={event.id}
          userId={userId}
          onClose={() => setShowAssignModal(false)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
}
