import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
  getEventByIdServer,
} from "@/app/actions/organization.actions";
import {
  getFormByEventId,
  getRecentSubmissions,
} from "@/services/event-form.service";
import { FormBuilder } from "./_components/FormBuilder";

interface PageProps {
  params: Promise<{ orgId: string; eventId: string }>;
}

async function publicBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    return `${proto}://${host}`;
  } catch {
    return "http://localhost:3000";
  }
}

export default async function FormBuilderPage({ params }: PageProps) {
  const { orgId, eventId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [org, event, membership] = await Promise.all([
    getOrganizationByIdServer(orgId),
    getEventByIdServer(eventId, orgId),
    getMyMembershipServer(orgId, user.id),
  ]);

  // getEventByIdServer now filters by org_id internally, so a null result
  // covers both "not found" and "wrong org" — no need for the previous
  // separate event.org_id !== orgId guard.
  if (!org || !event) notFound();
  if (
    !membership ||
    membership.status !== "Active" ||
    membership.role_id !== ROLE_ADMIN_ID
  ) {
    redirect(`/dashboard/organization/${orgId}/events/${eventId}`);
  }

  const form = await getFormByEventId(eventId);
  const submissions = form ? await getRecentSubmissions(form.id) : [];
  const baseUrl = await publicBaseUrl();

  return (
    <div className="flex flex-col gap-6 pt-6">
      <FormBuilder
        orgId={orgId}
        eventId={eventId}
        initial={form}
        initialSubmissions={submissions}
        publicBaseUrl={baseUrl}
      />
    </div>
  );
}
