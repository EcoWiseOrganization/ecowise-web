import { PublicShell } from "../_components/PublicShell";
import { AboutBody } from "./_components/AboutBody";
import { getPublicImpactStats } from "@/services/public-stats.service";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const stats = await getPublicImpactStats();
  return (
    <PublicShell>
      <AboutBody stats={stats} />
    </PublicShell>
  );
}
