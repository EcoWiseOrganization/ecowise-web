import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { getAdminOrgDetail } from "@/services/admin-orgs.service";
import { T } from "@/components/shared/TranslatedText";
import { VerificationControls } from "./VerificationControls";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function AdminOrgDetailPage({ params }: PageProps) {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }
  const { orgId } = await params;
  const detail = await getAdminOrgDetail(orgId);
  if (!detail) notFound();
  const { org, members, recentLogs, recentInvoices, recentAudits } = detail;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <Link
        href="/admin/organizations"
        className="text-sm text-[#1F8505] hover:underline"
      >
        ← <T k="admin.orgDetail.backToAll" />
      </Link>

      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-1">
          <h1 className="text-2xl font-bold text-[#155A03]">{org.legal_name}</h1>
          <p className="text-sm text-[#6E726E] font-mono">{org.tax_code}</p>
          <p className="text-sm text-[#6E726E]">
            {org.org_type ?? "—"} · {org.industry ?? "—"} ·{" "}
            <T k="admin.orgDetail.joined" />{" "}
            {new Date(org.created_at).toLocaleDateString()}
          </p>
          {org.contact_email && (
            <p className="text-sm">
              <span className="text-[#6E726E]"><T k="admin.orgDetail.contact" />:</span>{" "}
              {org.contact_email}
            </p>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <p className="text-[10px] uppercase text-[#6E726E]"><T k="admin.organizations.col.members" /></p>
            <p className="font-semibold">{org.member_count}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-[#6E726E]"><T k="admin.organizations.col.subscription" /></p>
            <p className="font-semibold">{org.active_subscription ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-[#6E726E]"><T k="admin.orgDetail.verification" /></p>
            <VerificationControls
              orgId={orgId}
              current={org.verification_status}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section titleKey="admin.orgDetail.members" countSuffix={members.length}>
          {members.length === 0 ? (
            <p className="text-sm text-[#AAAAAA]"><T k="admin.orgDetail.noMembers" /></p>
          ) : (
            <ul className="text-sm divide-y divide-gray-50">
              {members.map((m) => (
                <li
                  key={m.user_id}
                  className="py-1.5 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{m.full_name ?? m.email}</p>
                    <p className="text-xs text-[#AAAAAA]">{m.email}</p>
                  </div>
                  <span className="text-xs text-[#6E726E]">{m.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section titleKey="admin.orgDetail.recentInvoices">
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-[#AAAAAA]"><T k="admin.orgDetail.none" /></p>
          ) : (
            <ul className="text-sm divide-y divide-gray-50">
              {recentInvoices.map((i) => (
                <li
                  key={i.id}
                  className="py-1.5 flex justify-between items-center"
                >
                  <div>
                    <p className="font-mono text-xs">{i.invoice_number}</p>
                    <p className="text-xs text-[#AAAAAA]">{i.issue_date}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#155A03]">
                    ${Number(i.amount).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section titleKey="admin.orgDetail.recentLogs">
          {recentLogs.length === 0 ? (
            <p className="text-sm text-[#AAAAAA]"><T k="admin.orgDetail.none" /></p>
          ) : (
            <ul className="text-sm divide-y divide-gray-50">
              {recentLogs.map((l) => (
                <li
                  key={l.id}
                  className="py-1.5 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{l.activity_name}</p>
                    <p className="text-xs text-[#AAAAAA]">
                      {l.scope} · {l.reporting_date}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#155A03]">
                    {(l.co2e_result ?? 0).toFixed(2)} kg
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section titleKey="admin.orgDetail.recentAudit">
          {recentAudits.length === 0 ? (
            <p className="text-sm text-[#AAAAAA]"><T k="admin.orgDetail.none" /></p>
          ) : (
            <ul className="text-xs divide-y divide-gray-50">
              {recentAudits.map((a) => (
                <li key={a.id} className="py-1.5">
                  <span className="font-mono">{a.action}</span>{" "}
                  <span className="text-[#AAAAAA]">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  titleKey,
  countSuffix,
  children,
}: {
  titleKey: string;
  countSuffix?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-[#DAEDD5] rounded-2xl p-5">
      <h2 className="text-[#155A03] font-semibold mb-3">
        <T k={titleKey} />
        {countSuffix !== undefined ? ` (${countSuffix})` : ""}
      </h2>
      {children}
    </section>
  );
}
