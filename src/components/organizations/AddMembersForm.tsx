"use client";

import { useState } from "react";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";
import {
  addOrgMembersAction,
  type MemberAddResult,
} from "@/app/actions/organization.actions";
import type { OrganizationMemberWithUser } from "@/types/database.types";

interface AddMembersFormProps {
  orgId: string;
  onAdded?: (newMembers: OrganizationMemberWithUser[]) => void;
  onCancel?: () => void;
}

const STATUS_CONFIG = {
  created: {
    icon: <CheckCircleIcon sx={{ fontSize: 16, color: "#1F8505" }} />,
    label: "Account created & added",
    cls: "text-[#1F8505]",
  },
  existing_added: {
    icon: <CheckCircleIcon sx={{ fontSize: 16, color: "#2563EB" }} />,
    label: "Existing user added",
    cls: "text-blue-700",
  },
  already_member: {
    icon: <InfoIcon sx={{ fontSize: 16, color: "#AAAAAA" }} />,
    label: "Already a member",
    cls: "text-[#AAAAAA]",
  },
  error: {
    icon: <ErrorIcon sx={{ fontSize: 16, color: "#DC2626" }} />,
    label: "Failed",
    cls: "text-red-600",
  },
} as const;

export function AddMembersForm({ orgId, onAdded, onCancel }: AddMembersFormProps) {
  const [emailsText, setEmailsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MemberAddResult[]>([]);
  const [generalError, setGeneralError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = emailsText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) return;

    setLoading(true);
    setGeneralError("");
    setResults([]);

    const { results: res, error } = await addOrgMembersAction(emails, orgId);

    if (error) {
      setGeneralError(error);
      setLoading(false);
      return;
    }

    setResults(res);
    setDone(true);
    setLoading(false);

    // Notify parent about successfully added members so the list updates
    const added = res.filter((r) => r.status === "created" || r.status === "existing_added");
    if (added.length > 0) {
      // Build minimal member objects for optimistic UI update
      const newMembers: OrganizationMemberWithUser[] = added.map((r) => ({
        id: crypto.randomUUID(),
        org_id: orgId,
        user_id: "",
        role: "Standard Member",
        status: "Active",
        created_at: new Date().toISOString(),
        user: {
          id: "",
          full_name: r.email.split("@")[0],
          user_name: r.email.split("@")[0],
          email: r.email,
        },
      }));
      onAdded?.(newMembers);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#f0f9ed] flex items-center justify-center shrink-0">
          <GroupAddIcon sx={{ fontSize: 20, color: "#1F8505" }} />
        </div>
        <div>
          <h2 className="text-[#155A03] text-lg font-semibold leading-6">Add Members</h2>
          <p className="text-[#AAAAAA] text-xs">
            New accounts will use <span className="font-medium text-[#3B3D3B]">123456</span> as the default password.
          </p>
        </div>
      </div>

      {generalError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {generalError}
        </div>
      )}

      {!done ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#141514] text-sm font-medium">
              Email addresses <span className="text-red-500">*</span>
            </label>
            <textarea
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              placeholder={"alice@example.com\nbob@example.com\ncarol@example.com"}
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl border border-[#DAEDD5] bg-white text-[#141514] text-sm placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#79B669] focus:ring-2 focus:ring-[#79B669]/20 transition-colors resize-none"
            />
            <p className="text-[#AAAAAA] text-xs">One email per line, or separated by commas.</p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-5 py-2.5 rounded-xl border border-[#DAEDD5] text-[#3B3D3B] text-sm font-medium hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !emailsText.trim()}
              className="flex-1 px-5 py-2.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Adding…" : "Add Members"}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Results */}
          <div className="flex flex-col gap-2">
            <p className="text-[#141514] text-sm font-medium">Results</p>
            <ul className="flex flex-col gap-1.5">
              {results.map((r) => {
                const cfg = STATUS_CONFIG[r.status];
                return (
                  <li
                    key={r.email}
                    className="flex items-start gap-2 px-3 py-2 bg-white rounded-xl border border-[#DAEDD5]"
                  >
                    <span className="mt-0.5 shrink-0">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#141514] text-sm truncate">{r.email}</p>
                      <p className={`text-xs ${cfg.cls}`}>
                        {cfg.label}
                        {r.error ? `: ${r.error}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-full px-5 py-2.5 rounded-xl border border-[#DAEDD5] text-[#3B3D3B] text-sm font-medium hover:bg-[#f5f5f5] transition-colors"
          >
            Done
          </button>
        </>
      )}
    </form>
  );
}
