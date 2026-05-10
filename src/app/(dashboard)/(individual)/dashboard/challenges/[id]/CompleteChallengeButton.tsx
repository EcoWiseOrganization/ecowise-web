"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeChallengeAction } from "@/app/actions/gamification.actions";

export function CompleteChallengeButton({ challengeId }: { challengeId: string }) {
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

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={click}
        disabled={pending}
        className="self-start px-5 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Mark complete"}
      </button>
      {error && (
        <p className="text-sm text-red-700">
          {error === "ALREADY_COMPLETED"
            ? "You already completed this challenge."
            : error === "NOT_JOINED"
              ? "Join the challenge first."
              : error === "CHALLENGE_NOT_ACTIVE"
                ? "This challenge is not active right now."
                : error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700">
          🎉 +{success.pts} green points awarded!
        </p>
      )}
    </div>
  );
}
