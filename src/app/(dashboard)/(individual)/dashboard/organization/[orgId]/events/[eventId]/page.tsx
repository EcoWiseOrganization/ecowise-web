import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
  getEventByIdServer,
  getEventAssignmentsServer,
} from "@/app/actions/organization.actions";
import { EventDetailView } from "./_components/EventDetailView";

interface EventDetailPageProps {
  params: Promise<{ orgId: string; eventId: string }>;
}

export async function generateMetadata({ params }: EventDetailPageProps) {
  const { eventId } = await params;
  const event = await getEventByIdServer(eventId);
  return { title: event ? `${event.name} – EcoWise` : "Event – EcoWise" };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { orgId, eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [org, event, assignments, membership] = await Promise.all([
    getOrganizationByIdServer(orgId),
    getEventByIdServer(eventId),
    getEventAssignmentsServer(eventId),
    getMyMembershipServer(orgId, user.id),
  ]);

  if (!org || !event) notFound();

  const isAdmin = membership?.role === "Organization Admin";

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#AAAAAA] flex-wrap">
        <Link href="/dashboard/organization" className="hover:text-[#1F8505] transition-colors">
          Organizations
        </Link>
        <span>/</span>
        <Link href={`/dashboard/organization/${orgId}`} className="hover:text-[#1F8505] transition-colors">
          {org.name}
        </Link>
        <span>/</span>
        <span className="text-[#141514] font-medium">{event.name}</span>
      </nav>

      <EventDetailView
        event={event}
        orgId={orgId}
        initialAssignments={assignments}
        userId={user.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}
