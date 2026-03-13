import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getOrganizationByIdServer,
  getOrganizationMembersServer,
  getMyMembershipServer,
  getEventsByOrgServer,
} from "@/app/actions/organization.actions";
import { OrgDetailView } from "./_components/OrgDetailView";

interface OrgDetailPageProps {
  params: Promise<{ orgId: string }>;
}

export async function generateMetadata({ params }: OrgDetailPageProps) {
  const { orgId } = await params;
  const org = await getOrganizationByIdServer(orgId);
  return { title: org ? `${org.name} – EcoWise` : "Organization – EcoWise" };
}

export default async function OrgDetailPage({ params }: OrgDetailPageProps) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [org, members, events, membership] = await Promise.all([
    getOrganizationByIdServer(orgId),
    getOrganizationMembersServer(orgId),
    getEventsByOrgServer(orgId),
    getMyMembershipServer(orgId, user.id),
  ]);

  if (!org) notFound();

  const isAdmin = membership?.role === "Organization Admin";

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#AAAAAA]">
        <Link href="/dashboard/organization" className="hover:text-[#1F8505] transition-colors">
          Organizations
        </Link>
        <span>/</span>
        <span className="text-[#141514] font-medium">{org.name}</span>
      </nav>

      <OrgDetailView
        org={org}
        members={members}
        initialEvents={events}
        userId={user.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}
