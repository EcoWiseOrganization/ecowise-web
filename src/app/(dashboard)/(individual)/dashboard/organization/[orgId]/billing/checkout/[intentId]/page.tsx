import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { createServiceClient } from "@/lib/supabase/service";
import { getInvoice } from "@/services/subscription.service";
import { CheckoutView } from "@/components/billing/CheckoutView";
import type { PaymentIntent } from "@/types/subscription.types";

interface PageProps {
  params: Promise<{ orgId: string; intentId: string }>;
}

export default async function OrgCheckoutPage({ params }: PageProps) {
  const { orgId, intentId } = await params;
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

  const db = createServiceClient();
  const { data: intent } = await db
    .from("PaymentIntents")
    .select("*")
    .eq("id", intentId)
    .maybeSingle();
  if (!intent) notFound();

  const invoice = await getInvoice(intent.invoice_id);
  if (!invoice || invoice.subject_type !== "Org" || invoice.subject_id !== orgId) {
    notFound();
  }

  // Reject stale intents BEFORE rendering CheckoutView — a Succeeded /
  // Failed / Expired intent shouldn't show a "Pay" button (the previous
  // version would render and then surface a confusing error on submit).
  // The expires_at fallback covers Pending intents that aged out of the
  // 30-minute window without anyone running the cron.
  const ACTIVE_STATUSES = new Set(["Pending", "Processing"]);
  const intentExpired =
    intent.expires_at && new Date(intent.expires_at) < new Date();
  if (!ACTIVE_STATUSES.has(intent.status) || intentExpired) {
    // Paid → straight to the invoice page; everything else → the invoice
    // list with the failed intent visible there.
    if (intent.status === "Paid") {
      redirect(
        `/dashboard/organization/${orgId}/billing/invoices/${invoice.id}`,
      );
    }
    redirect(`/dashboard/organization/${orgId}/billing/invoices`);
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-[#155A03] text-xl font-bold">Complete payment</h1>
      <CheckoutView
        intent={intent as PaymentIntent}
        invoice={invoice}
        successHref={`/dashboard/organization/${orgId}/billing/invoices/${invoice.id}`}
      />
    </div>
  );
}
