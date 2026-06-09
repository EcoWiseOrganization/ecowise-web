import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { T } from "@/components/shared/TranslatedText";
import {
  getOrganizationByIdServer,
  getEventByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { EventDetailView } from "./_components/EventDetailView";

interface EventDetailPageProps {
  params: Promise<{ orgId: string; eventId: string }>;
}

export async function generateMetadata({ params }: EventDetailPageProps) {
  const { orgId, eventId } = await params;
  // Pass orgId so a crafted (orgId, eventId) pair can't fish for an event
  // belonging to another tenant via the SSR-cached page title.
  const event = await getEventByIdServer(eventId, orgId);
  return { title: event ? `${event.name} – EcoWise` : "Event – EcoWise" };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { orgId, eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Membership gate must run before the event/org data fetch is rendered —
  // a non-member can't see this page even if they know the (orgId, eventId)
  // pair. notFound() (not "forbidden") so the URL doesn't probe existence.
  const membership = await getMyMembershipServer(orgId, user.id);
  if (!membership) notFound();

  const [org, event] = await Promise.all([
    getOrganizationByIdServer(orgId),
    getEventByIdServer(eventId, orgId),
  ]);

  if (!org || !event) notFound();

  return (
    <div className="flex flex-col gap-6 pt-6">
      <nav className="flex items-center gap-2 text-sm text-[#AAAAAA] flex-wrap">
        <Link href="/dashboard/organization" className="hover:text-[#1F8505] transition-colors">
          <T k="common.breadcrumb.organizations" />
        </Link>
        <span>/</span>
        <Link href={`/dashboard/organization/${orgId}`} className="hover:text-[#1F8505] transition-colors">
          {org.legal_name}
        </Link>
        <span>/</span>
        <span className="text-[#141514] font-medium">{event.name}</span>
        <span className="ml-auto" />
        <Link
          href={`/dashboard/organization/${orgId}/events/${event.id}/form-builder`}
          className="px-3 py-1.5 rounded-lg border border-[#DAEDD5] text-[#1F8505] text-xs font-semibold hover:bg-[#f0f9ed]"
        >
          <T k="publicForm.builder.openLink" />
        </Link>
      </nav>

      <EventDetailView event={event} />
    </div>
  );
}
