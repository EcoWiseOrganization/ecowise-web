"use client";

import { useState } from "react";
import Link from "next/link";
import EventIcon from "@mui/icons-material/Event";
import GroupIcon from "@mui/icons-material/Group";
import AddIcon from "@mui/icons-material/Add";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { useTranslation } from "react-i18next";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import type { Organization, OrganizationMemberWithUser, Event } from "@/types/database.types";
import { CreateEventForm } from "@/components/events/CreateEventForm";
import { AddMembersForm } from "@/components/organizations/AddMembersForm";

const STATUS_STYLE_MAP: Record<string, string> = {
  Active: "bg-[#f0f9ed] text-[#1F8505] border-[#DAEDD5]",
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-gray-100 text-gray-600 border-gray-200",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const labelKey = `event.status.${status.toLowerCase()}`;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE_MAP[status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {t(labelKey, { defaultValue: status })}
    </span>
  );
}

interface OrgDetailViewProps {
  org: Organization;
  initialMembers: OrganizationMemberWithUser[];
  initialEvents: Event[];
  userId: string;
  isAdmin: boolean;
}

export function OrgDetailView({ org, initialMembers, initialEvents, userId, isAdmin }: OrgDetailViewProps) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<OrganizationMemberWithUser[]>(initialMembers);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);

  const handleEventCreated = (event: Event) => {
    setEvents((prev) => [event, ...prev]);
    setShowEventModal(false);
  };

  const handleMembersAdded = (newMembers: OrganizationMemberWithUser[]) => {
    setMembers((prev) => [...prev, ...newMembers]);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Org header card */}
      <div className="bg-white rounded-2xl border border-[#DAEDD5] px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-[#141514] text-xl font-bold truncate">{org.legal_name}</h1>
          <p className="text-[#AAAAAA] text-sm mt-1">{org.org_type}</p>
          <p className="text-[#AAAAAA] text-xs mt-0.5">
            {t("org.taxCode")} <span className="text-[#3B3D3B] font-medium">{org.tax_code}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[#AAAAAA] text-xs shrink-0">
          <GroupIcon sx={{ fontSize: 14 }} />
          {t("org.memberCount_other", { count: members.length })}
        </div>
      </div>

      {/* Members section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#141514] text-base font-semibold">
            {t("org.members")} ({members.length})
          </h2>
          {isAdmin && (
            <button
              onClick={() => setShowAddMembersModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-xs font-semibold hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all cursor-pointer"
            >
              <PersonAddIcon sx={{ fontSize: 14 }} />
              {t("org.addMembers")}
            </button>
          )}
        </div>
        {members.length === 0 ? (
          <p className="text-[#AAAAAA] text-sm">{t("org.noMembers")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const name = m.user?.full_name || m.user?.user_name || m.user?.email || "Unknown";
              const isAdminMember = m.role_id === ROLE_ADMIN_ID;
              return (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-[#DAEDD5] text-sm">
                  <div className="w-6 h-6 rounded-full bg-[linear-gradient(135deg,#79B669,#1F8505)] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[#141514] font-medium">{name}</span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${isAdminMember ? "bg-[#f0f9ed] text-[#1F8505] border-[#DAEDD5]" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                    {isAdminMember ? t("org.roleAdmin") : t("org.roleMember")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Events section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#141514] text-base font-semibold">
            {t("org.events")} ({events.length})
          </h2>
          {isAdmin && (
            <button
              onClick={() => setShowEventModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-xs font-semibold hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all cursor-pointer"
            >
              <AddIcon sx={{ fontSize: 14 }} />
              {t("org.newEvent")}
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 border-2 border-dashed border-[#DAEDD5] rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#f0f9ed] flex items-center justify-center">
              <EventIcon sx={{ fontSize: 24, color: "#79B669" }} />
            </div>
            <div className="text-center">
              <p className="text-[#3B3D3B] text-sm font-medium">{t("org.noEvents")}</p>
              {isAdmin && <p className="text-[#AAAAAA] text-xs mt-1">{t("org.noEventsHint")}</p>}
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowEventModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 transition-all cursor-pointer"
              >
                <AddIcon sx={{ fontSize: 16 }} />
                {t("org.newEvent")}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/dashboard/organization/${org.id}/events/${event.id}`}
                className="flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-[#DAEDD5] hover:border-[#79B669] hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#f0f9ed] flex items-center justify-center shrink-0">
                  <EventIcon sx={{ fontSize: 18, color: "#1F8505" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#141514] text-sm font-semibold truncate">{event.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <CalendarTodayIcon sx={{ fontSize: 11, color: "#AAAAAA" }} />
                    <p className="text-[#AAAAAA] text-xs">{event.start_date} → {event.end_date}</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#f0f9ed] text-[#3B3D3B] border border-[#DAEDD5] shrink-0">
                  {t(`event.type.${event.event_type.toLowerCase()}`, { defaultValue: event.event_type })}
                </span>
                <StatusBadge status={event.status} />
                <ChevronRightIcon sx={{ fontSize: 18, color: "#AAAAAA" }} className="shrink-0 group-hover:text-[#1F8505] transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowEventModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <CreateEventForm orgId={org.id} userId={userId} onSuccess={handleEventCreated} onCancel={() => setShowEventModal(false)} />
          </div>
        </div>
      )}

      {showAddMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowAddMembersModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <AddMembersForm orgId={org.id} onAdded={handleMembersAdded} onCancel={() => setShowAddMembersModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
