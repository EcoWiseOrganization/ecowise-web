"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { joinChallengeAction } from "@/app/actions/gamification.actions";
import type { Challenge, UserChallenge } from "@/types/gamification.types";

interface Props {
  challenges: Challenge[];
  joined: UserChallenge[];
}

export function ChallengesBrowser({ challenges, joined }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const joinedIds = new Set(joined.map((j) => j.challenge_id));

  const join = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await joinChallengeAction(id);
      if (res.error || !res.data) {
        setError(res.error ?? "unknown");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {challenges.length === 0 ? (
        <div className="bg-white border border-[#DAEDD5] rounded-2xl p-12 text-center text-sm text-[#6E726E]">
          No challenges available right now. Check back later!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((c) => {
            const isJoined = joinedIds.has(c.id);
            return (
              <article
                key={c.id}
                className="bg-white border border-[#DAEDD5] rounded-2xl p-6 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-[#79B669]">
                    {c.category}
                  </span>
                  <span className="bg-[#F0FDF4] text-[#1F8505] text-xs px-2 py-0.5 rounded-full font-semibold">
                    +{c.points_reward} pts
                  </span>
                </div>
                <h3 className="text-[#155A03] font-semibold">{c.name}</h3>
                {c.description && (
                  <p className="text-sm text-[#3B3D3B] line-clamp-3">
                    {c.description}
                  </p>
                )}
                <p className="text-xs text-[#AAAAAA]">
                  {c.start_date} → {c.end_date} · {c.duration_days}d
                </p>
                <div className="flex justify-between items-center mt-2">
                  <Link
                    href={`/dashboard/challenges/${c.id}`}
                    className="text-xs text-[#1F8505] hover:underline"
                  >
                    Details
                  </Link>
                  {isJoined ? (
                    <span className="text-xs text-[#1F8505] font-semibold">
                      Joined ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => join(c.id)}
                      disabled={pending || c.status !== "Active"}
                      className="px-3 py-1.5 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-xs font-semibold disabled:opacity-50"
                    >
                      {c.status !== "Active" ? c.status : "Join"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
