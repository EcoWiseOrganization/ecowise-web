import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { T } from "@/components/shared/TranslatedText";
import {
  getOrganizationByIdServer,
  getEventByIdServer,
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

  const [org, event] = await Promise.all([
    getOrganizationByIdServer(orgId),
    getEventByIdServer(eventId),
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
      </nav>

      <EventDetailView event={event} />
    </div>
  );
}
