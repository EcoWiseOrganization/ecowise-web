"use client";

/**
 * AssignEmployeeModal.tsx
 * Modal for assigning an organization member to an event.
 * Renders a searchable list of members, prevents duplicate assignments.
 */

import { useEffect, useState, useCallback } from "react";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import {
  assignEmployeeAction,
  getOrganizationMembersServer,
  getEventAssignmentsServer,
} from "@/app/actions/organization.actions";
import type { OrganizationMemberWithUser, EventAssignmentWithUser } from "@/types/database.types";
import { useToast } from "@/components/ui/Toast";

// ── Props ────────────────────────────────────────────────────────

interface AssignEmployeeModalProps {
  orgId: string;
  eventId: string;
  /** auth.uid() of the currently logged-in user (assigned_by) */
  userId: string;
  /** Called when modal should close */
  onClose: () => void;
  /** Called after any successful assignment */
  onAssigned?: () => void;
}

// ── Component ────────────────────────────────────────────────────

export function AssignEmployeeModal({
  orgId,
  eventId,
  userId,
  onClose,
  onAssigned,
}: AssignEmployeeModalProps) {
  const { showToast } = useToast();

  const [members, setMembers] = useState<OrganizationMemberWithUser[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Load members + current assignments
  const loadData = useCallback(async () => {
    setLoadingData(true);
    setError("");
    try {
      const [membersData, assignmentsData]: [
        OrganizationMemberWithUser[],
        EventAssignmentWithUser[]
      ] = await Promise.all([
        getOrganizationMembersServer(orgId),
        getEventAssignmentsServer(eventId),
      ]);
      setMembers(membersData);
      setAssigned(new Set(assignmentsData.map((a) => a.user_id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoadingData(false);
    }
  }, [orgId, eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAssign = async (member: OrganizationMemberWithUser) => {
    if (assigned.has(member.user_id)) return;
    setAssigningId(member.user_id);
    const { error } = await assignEmployeeAction({
      event_id: eventId,
      user_id: member.user_id,
      assigned_by: userId,
    });
    if (error) {
      showToast(error, "error");
    } else {
      setAssigned((prev) => new Set([...prev, member.user_id]));
      const name = member.user?.full_name || member.user?.user_name || member.user?.email || "Employee";
      showToast(`${name} assigned to event successfully.`, "success");
      onAssigned?.();
    }
    setAssigningId(null);
  };

  // Filter by name/email
  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.user?.full_name?.toLowerCase().includes(q) ||
      m.user?.user_name?.toLowerCase().includes(q) ||
      m.user?.email?.toLowerCase().includes(q)
    );
  });

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Dialog */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#DAEDD5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f0f9ed] flex items-center justify-center shrink-0">
              <PersonAddIcon sx={{ fontSize: 18, color: "#1F8505" }} />
            </div>
            <div>
              <h2 className="text-[#155A03] text-base font-semibold leading-5">
                Assign Employee
              </h2>
              <p className="text-[#AAAAAA] text-xs">
                Select a member to assign to this event.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#AAAAAA] hover:text-[#3B3D3B] hover:bg-[#f5f5f5] transition-colors"
            aria-label="Close"
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-[#DAEDD5]">
          <div className="relative">
            <SearchIcon
              sx={{ fontSize: 16, color: "#AAAAAA" }}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#DAEDD5] bg-white text-[#141514] text-sm placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#79B669] focus:ring-2 focus:ring-[#79B669]/20 transition-colors"
            />
          </div>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loadingData ? (
            <div className="flex items-center justify-center py-10 text-[#AAAAAA] text-sm">
              Loading members…
            </div>
          ) : error ? (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-[#AAAAAA] text-sm">
              {search ? "No members match your search." : "No members found."}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((member) => {
                const isAssigned = assigned.has(member.user_id);
                const isAssigning = assigningId === member.user_id;
                const displayName =
                  member.user?.full_name ||
                  member.user?.user_name ||
                  member.user?.email ||
                  "Unknown";
                const subtitle = member.user?.email || member.user?.user_name || "";

                return (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#DAEDD5] hover:border-[#79B669] hover:bg-[#f8fef6] transition-all"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-[linear-gradient(135deg,#79B669,#1F8505)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {displayName.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[#141514] text-sm font-medium truncate">
                        {displayName}
                      </p>
                      {subtitle && (
                        <p className="text-[#AAAAAA] text-xs truncate">{subtitle}</p>
                      )}
                    </div>

                    {/* Role badge */}
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#DAEDD5] text-[#3B3D3B] shrink-0">
                      {member.role}
                    </span>

                    {/* Action button */}
                    {isAssigned ? (
                      <span className="flex items-center gap-1 text-[#1F8505] text-xs font-medium shrink-0">
                        <CheckIcon sx={{ fontSize: 14 }} />
                        Assigned
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAssign(member)}
                        disabled={isAssigning}
                        className="shrink-0 px-3 py-1 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAssigning ? "…" : "Assign"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#DAEDD5]">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-5 py-2.5 rounded-xl border border-[#DAEDD5] text-[#3B3D3B] text-sm font-medium hover:bg-[#f5f5f5] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
