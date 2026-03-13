"use client";

import { useState } from "react";
import Link from "next/link";
import AddIcon from "@mui/icons-material/Add";
import BusinessIcon from "@mui/icons-material/Business";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import type { Organization } from "@/types/database.types";
import { CreateOrgForm } from "@/components/organizations/CreateOrgForm";

interface OrganizationsViewProps {
  initialOrgs: Organization[];
  userId: string;
}

export function OrganizationsView({ initialOrgs, userId }: OrganizationsViewProps) {
  const [orgs, setOrgs] = useState<Organization[]>(initialOrgs);
  const [showModal, setShowModal] = useState(false);

  const handleOrgCreated = (org: Organization) => {
    setOrgs((prev) => [org, ...prev]);
    setShowModal(false);
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[#3B3D3B] text-sm">
          {orgs.length === 0
            ? "No organizations yet."
            : `${orgs.length} organization${orgs.length > 1 ? "s" : ""}`}
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all"
        >
          <AddIcon sx={{ fontSize: 16 }} />
          New Organization
        </button>
      </div>

      {/* List */}
      {orgs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 border-2 border-dashed border-[#DAEDD5] rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#f0f9ed] flex items-center justify-center">
            <BusinessIcon sx={{ fontSize: 28, color: "#79B669" }} />
          </div>
          <div className="text-center">
            <p className="text-[#3B3D3B] text-sm font-medium">No organizations yet</p>
            <p className="text-[#AAAAAA] text-xs mt-1">
              Create your first organization to get started.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 transition-all"
          >
            <AddIcon sx={{ fontSize: 16 }} />
            New Organization
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/dashboard/organization/${org.id}`}
              className="flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-[#DAEDD5] hover:border-[#79B669] hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#f0f9ed] flex items-center justify-center shrink-0">
                <BusinessIcon sx={{ fontSize: 20, color: "#1F8505" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#141514] text-sm font-semibold truncate">{org.name}</p>
                <p className="text-[#AAAAAA] text-xs truncate mt-0.5">
                  {org.org_type} · {org.industry}
                </p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#f0f9ed] text-[#1F8505] border border-[#DAEDD5] shrink-0">
                {org.org_type}
              </span>
              <ChevronRightIcon
                sx={{ fontSize: 18, color: "#AAAAAA" }}
                className="shrink-0 group-hover:text-[#1F8505] transition-colors"
              />
            </Link>
          ))}
        </div>
      )}

      {/* Create org modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <CreateOrgForm
              userId={userId}
              onSuccess={handleOrgCreated}
              onCancel={() => setShowModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
