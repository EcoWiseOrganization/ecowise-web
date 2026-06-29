"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { completeChallengeAction, completeChallengeEvidenceAction } from "@/app/actions/gamification.actions";

export function CompleteChallengeButton({ challengeId }: { challengeId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ pts: number; status?: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const click = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      if (!file) {
        setError(t("challenges.error.missingEvidence", "Vui lòng tải lên ảnh bằng chứng"));
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await completeChallengeEvidenceAction(challengeId, formData);
      
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return;
      }
      setSuccess({ pts: res.pointsAwarded, status: res.status });
      router.refresh();
    });
  };

  // Server-side error codes map to translated copy. Anything we don't
  // know about falls through to a generic message so we never surface
  // raw codes like NOT_JOINED to the user.
  const errorMessage = (code: string) => {
    switch (code) {
      case "ALREADY_COMPLETED":
        return t("challenges.error.alreadyCompleted");
      case "NOT_JOINED":
        return t("challenges.error.completeFailed");
      case "CHALLENGE_NOT_ACTIVE":
        return t("challenges.error.completeFailed");
      default:
        return t("challenges.error.completeFailed");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!success && (
        <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <label className="text-sm font-medium text-gray-700">
            {t("challenges.uploadEvidence", "Upload evidence (Required)")}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          {file && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={URL.createObjectURL(file)} alt="Preview" className="w-24 h-24 object-cover rounded mt-2 border" />
          )}
        </div>
      )}
      
      {!success && (
        <button
          type="button"
          onClick={click}
          disabled={pending || !file}
          className="self-start px-5 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? t("challenges.submitting") : t("challenges.markComplete")}
        </button>
      )}

      {error && (
        <p className="text-sm text-red-700">{errorMessage(error)}</p>
      )}
      
      {success && (
        <p className="text-sm text-[#1F8505] font-medium p-3 bg-[#DAEDD5]/30 rounded-lg border border-[#DAEDD5]">
          {success.status === "PendingReview" 
            ? "Your submission is pending review. You will receive points once approved!"
            : `🎉 +${success.pts} green points awarded!`}
        </p>
      )}
    </div>
  );
}
