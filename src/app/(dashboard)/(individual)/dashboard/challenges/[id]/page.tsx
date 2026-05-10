import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getChallenge } from "@/services/gamification.service";
import { CompleteChallengeButton } from "./CompleteChallengeButton";
import type { UserChallenge } from "@/types/gamification.types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChallengeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ch = await getChallenge(id);
  if (!ch) notFound();

  const db = createServiceClient();
  const { data: ucRow } = await db
    .from("UserChallenges")
    .select("*")
    .eq("user_id", user.id)
    .eq("challenge_id", id)
    .maybeSingle();
  const uc = (ucRow as UserChallenge | null) ?? null;

  const isActive =
    ch.status === "Active" &&
    new Date(ch.start_date) <= new Date() &&
    new Date(ch.end_date) >= new Date();

  return (
    <div className="flex flex-col gap-6 pt-6 max-w-3xl">
      <Link href="/dashboard/challenges" className="text-sm text-[#1F8505] hover:underline">
        ← All challenges
      </Link>
      <header>
        <span className="text-[10px] uppercase tracking-wide text-[#79B669]">
          {ch.category}
        </span>
        <h1 className="text-2xl font-bold text-[#155A03]">{ch.name}</h1>
        <p className="text-sm text-[#6E726E]">
          {ch.start_date} → {ch.end_date} · {ch.duration_days}d · Verification:{" "}
          {ch.verification_method}
        </p>
      </header>

      {ch.description && (
        <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6 text-sm whitespace-pre-wrap">
          {ch.description}
        </div>
      )}

      <div className="bg-[#F0FDF4] border border-[#DAEDD5] rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-[#6E726E]">Reward</p>
          <p className="text-2xl font-bold text-[#1F8505]">
            +{ch.points_reward} green points
          </p>
        </div>
        <div>
          {!uc && <p className="text-sm text-[#6E726E]">Not joined</p>}
          {uc?.status === "Joined" && (
            <p className="text-sm text-[#1F8505]">Joined ✓</p>
          )}
          {uc?.status === "Completed" && (
            <p className="text-sm text-[#1F8505] font-semibold">
              Completed{" "}
              {uc.completed_at
                ? new Date(uc.completed_at).toLocaleDateString()
                : ""}
            </p>
          )}
        </div>
      </div>

      {uc && uc.status !== "Completed" && isActive && (
        <CompleteChallengeButton challengeId={ch.id} />
      )}
    </div>
  );
}
