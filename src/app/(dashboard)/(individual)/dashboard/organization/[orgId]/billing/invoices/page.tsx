import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  getOrganizationByIdServer,
  getMyMembershipServer,
} from "@/app/actions/organization.actions";
import { listInvoices } from "@/services/subscription.service";
import { InvoiceList } from "@/components/billing/InvoiceList";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function OrgInvoicesPage({ params }: PageProps) {
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

  const invoices = await listInvoices("Org", orgId);

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-[#155A03] text-xl font-bold">Invoices</h1>
      <InvoiceList
        invoices={invoices}
        detailBase={`/dashboard/organization/${orgId}/billing/invoices`}
      />
    </div>
  );
}
