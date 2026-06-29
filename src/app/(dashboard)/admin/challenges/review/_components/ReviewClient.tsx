"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewChallengeSubmissionAction } from "@/app/actions/gamification.actions";

interface Props {
  initialSubmissions: Record<string, any>[];
}

export function ReviewClient({ initialSubmissions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleReview = (id: string, approved: boolean) => {
    startTransition(async () => {
      await reviewChallengeSubmissionAction({ userChallengeId: id, approved });
      router.refresh();
    });
  };

  if (initialSubmissions.length === 0) {
    return (
      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-12 text-center text-sm text-[#6E726E]">
        Hiện không có bài nộp nào đang chờ duyệt.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {initialSubmissions.map((sub) => {
        const challenge = sub.challenge as any;
        const user = sub.user as any;
        return (
          <div key={sub.id} className="bg-white border border-[#DAEDD5] rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1 flex flex-col gap-2">
              <h3 className="font-semibold text-lg text-[#155A03]">{challenge?.name}</h3>
              <p className="text-sm text-gray-600">
                <span className="font-medium">User:</span> {user?.full_name || user?.user_name || user?.email}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Nộp lúc:</span> {new Date(sub.completed_at as string).toLocaleString()}
              </p>
              <p className="text-sm font-semibold text-[#1F8505]">
                Phần thưởng: +{challenge?.points_reward} points
              </p>
            </div>
            
            <div className="flex-1 flex justify-center">
              {sub.evidence_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <a href={sub.evidence_url as string} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sub.evidence_url as string} alt="Evidence" className="w-48 h-48 object-cover rounded-lg border border-gray-200" />
                </a>
              ) : (
                <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-lg text-sm text-gray-400">
                  Không có ảnh
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 self-stretch justify-center">
              <button
                type="button"
                onClick={() => handleReview(sub.id as string, true)}
                disabled={pending}
                className="px-6 py-2 rounded-lg bg-[#1F8505] text-white text-sm font-semibold disabled:opacity-50"
              >
                Duyệt & Tặng Điểm
              </button>
              <button
                type="button"
                onClick={() => handleReview(sub.id as string, false)}
                disabled={pending}
                className="px-6 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                Từ chối
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
