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
