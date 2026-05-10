import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { getPendingEmissionLogs } from "@/services/org-admin.service";
import { ReviewQueue } from "./_components/ReviewQueue";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

interface RawLog {
  id: string;
  activity_name: string;
  scope: string;
  reporting_date: string;
  quantity: number;
  unit: string;
  co2e_result: number | null;
  status: string;
  evidence_url: string | null;
  category: { id: string; name: string } | { id: string; name: string }[] | null;
}

export default async function ReviewLogsPage({ params }: PageProps) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [org, membership] = await Promise.all([
    getOrganizationByIdServer(orgId),
    getMyMembershipServer(orgId, user.id),
  ]);

  if (!org) notFound();
  if (
    !membership ||
    membership.status !== "Active" ||
    membership.role_id !== ROLE_ADMIN_ID
  ) {
    redirect(`/dashboard/organization/${orgId}/overview`);
  }

  const raw = (await getPendingEmissionLogs(orgId)) as unknown as RawLog[];
  const logs = raw.map((r) => ({
    ...r,
    // Supabase may return joined relation as array or single object — normalize.
    category: Array.isArray(r.category) ? r.category[0] ?? null : r.category,
  }));

  return <ReviewQueue orgId={orgId} initialLogs={logs} />;
}
