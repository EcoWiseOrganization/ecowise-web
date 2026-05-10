import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { PublicFormView } from "./_components/PublicFormView";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

export default async function PublicEventFormPage({ params }: PageProps) {
  const { token } = await params;

  const db = createServiceClient();
  const { data: form } = await db
    .from("EventPublicForms")
    .select(
      "id, event_id, org_id, status, welcome_message, brand_color"
    )
    .eq("token", token)
    .maybeSingle();

  if (!form) notFound();
  if (form.status !== "Published") {
    notFound();
  }

  const [eventRes, orgRes] = await Promise.all([
    db.from("Events")
      .select("id, name, start_date, end_date")
      .eq("id", form.event_id)
      .single(),
    db.from("Organization")
      .select("id, legal_name, logo_url")
      .eq("id", form.org_id)
      .single(),
  ]);

  if (!eventRes.data || !orgRes.data) notFound();

  return (
    <PublicFormView
      token={token}
      form={{
        id: form.id,
        welcome_message: form.welcome_message,
        brand_color: form.brand_color,
      }}
      event={eventRes.data}
      organization={orgRes.data}
    />
  );
}
