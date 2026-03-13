"use client";

import { useState } from "react";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";
import { useTranslation } from "react-i18next";
import {
  addOrgMembersAction,
  type MemberAddResult,
} from "@/app/actions/organization.actions";
import { ROLE_MEMBER_ID } from "@/lib/roles";
import type { OrganizationMemberWithUser } from "@/types/database.types";

interface AddMembersFormProps {
  orgId: string;
  onAdded?: (newMembers: OrganizationMemberWithUser[]) => void;
  onCancel?: () => void;
}

export function AddMembersForm({ orgId, onAdded, onCancel }: AddMembersFormProps) {
  const { t } = useTranslation();
  const [emailsText, setEmailsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MemberAddResult[]>([]);
  const [generalError, setGeneralError] = useState("");
  const [done, setDone] = useState(false);

  const statusConfig = {
    created:        { icon: <CheckCircleIcon sx={{ fontSize: 16, color: "#1F8505" }} />, label: t("org.memberCreated"),  cls: "text-[#1F8505]" },
    existing_added: { icon: <CheckCircleIcon sx={{ fontSize: 16, color: "#2563EB" }} />, label: t("org.memberExisting"), cls: "text-blue-700" },
    already_member: { icon: <InfoIcon sx={{ fontSize: 16, color: "#AAAAAA" }} />,        label: t("org.memberExists"),   cls: "text-[#AAAAAA]" },
    error:          { icon: <ErrorIcon sx={{ fontSize: 16, color: "#DC2626" }} />,       label: t("common.failed"),      cls: "text-red-600" },
  } as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = emailsText.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean);
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

    const added = res.filter((r) => r.status === "created" || r.status === "existing_added");
    if (added.length > 0) {
      const newMembers: OrganizationMemberWithUser[] = added.map((r) => ({
        id: crypto.randomUUID(),
        org_id: orgId,
        user_id: "",
        role_id: ROLE_MEMBER_ID,
        status: "Active",
        created_at: new Date().toISOString(),
        created_by: null,
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#f0f9ed] flex items-center justify-center shrink-0">
          <GroupAddIcon sx={{ fontSize: 20, color: "#1F8505" }} />
        </div>
        <div>
          <h2 className="text-[#155A03] text-lg font-semibold leading-6">{t("org.addMembers")}</h2>
          <p className="text-[#AAAAAA] text-xs">
            {t("org.addMembersHint").replace("<b>", "").replace("</b>", "")}
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
              {t("org.form.emails")} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              placeholder={"alice@example.com\nbob@example.com\ncarol@example.com"}
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl border border-[#DAEDD5] bg-white text-[#141514] text-sm placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#79B669] focus:ring-2 focus:ring-[#79B669]/20 transition-colors resize-none"
            />
            <p className="text-[#AAAAAA] text-xs">{t("org.form.emailsHint")}</p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-5 py-2.5 rounded-xl border border-[#DAEDD5] text-[#3B3D3B] text-sm font-medium hover:bg-[#f5f5f5] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {t("common.cancel")}
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !emailsText.trim()}
              className="flex-1 px-5 py-2.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? t("org.adding") : t("org.addMembers")}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-[#141514] text-sm font-medium">{t("common.results")}</p>
            <ul className="flex flex-col gap-1.5">
              {results.map((r) => {
                const cfg = statusConfig[r.status];
                return (
                  <li key={r.email} className="flex items-start gap-2 px-3 py-2 bg-white rounded-xl border border-[#DAEDD5]">
                    <span className="mt-0.5 shrink-0">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#141514] text-sm truncate">{r.email}</p>
                      <p className={`text-xs ${cfg.cls}`}>
                        {cfg.label}{r.error ? `: ${r.error}` : ""}
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
            className="w-full px-5 py-2.5 rounded-xl border border-[#DAEDD5] text-[#3B3D3B] text-sm font-medium hover:bg-[#f5f5f5] transition-colors cursor-pointer"
          >
            {t("common.done")}
          </button>
        </>
      )}
    </form>
  );
}
