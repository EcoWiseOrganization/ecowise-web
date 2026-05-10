import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import {
  getActiveIntentForInvoice,
  getInvoice,
} from "@/services/subscription.service";
import { InvoiceDetail } from "@/components/billing/InvoiceDetail";

interface PageProps {
  params: Promise<{ orgId: string; invoiceId: string }>;
}

export default async function OrgInvoiceDetailPage({ params }: PageProps) {
  const { orgId, invoiceId } = await params;
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

  const invoice = await getInvoice(invoiceId);
  if (!invoice || invoice.subject_type !== "Org" || invoice.subject_id !== orgId) {
    notFound();
  }
  const intent = await getActiveIntentForInvoice(invoiceId);

  return (
    <div className="pt-2">
      <InvoiceDetail
        invoice={invoice}
        intent={intent}
        backHref={`/dashboard/organization/${orgId}/billing/invoices`}
        checkoutBase={`/dashboard/organization/${orgId}/billing/checkout`}
      />
    </div>
  );
}
