"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { completeChallengeAction } from "@/app/actions/gamification.actions";

export function CompleteChallengeButton({ challengeId }: { challengeId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ pts: number } | null>(null);

  const click = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await completeChallengeAction(challengeId);
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return;
      }
      setSuccess({ pts: res.pointsAwarded });
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
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={click}
        disabled={pending}
        className="self-start px-5 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold disabled:opacity-50"
      >
        {pending ? t("challenges.submitting") : t("challenges.markComplete")}
      </button>
      {error && (
        <p className="text-sm text-red-700">{errorMessage(error)}</p>
      )}
      {success && (
        <p className="text-sm text-green-700">
          🎉 +{success.pts} green points awarded!
        </p>
      )}
    </div>
  );
}
