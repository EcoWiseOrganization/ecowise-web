"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrgVerificationStatusAction } from "@/app/actions/admin.actions";

const OPTIONS: ("Pending" | "Verified" | "Suspended")[] = [
  "Pending",
  "Verified",
  "Suspended",
];

export function VerificationControls({
  orgId,
  current,
}: {
  orgId: string;
  current: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>(current ?? "Pending");
  const [error, setError] = useState<string | null>(null);

  const apply = (next: "Pending" | "Verified" | "Suspended") => {
    setError(null);
    setStatus(next);
    startTransition(async () => {
      const res = await setOrgVerificationStatusAction(orgId, next);
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => apply(o)}
            disabled={pending || status === o}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 ${
              status === o
                ? "bg-[#155A03] text-white"
                : "bg-white border border-[#DAEDD5] text-[#155A03]"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
