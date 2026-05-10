import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  ComplianceChecklistItem,
  ComplianceReportData,
  EmissionReportData,
  PersonalReportData,
} from "@/types/report.types";

// ── Shared style ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontSize: 10,
    color: "#3B3D3B",
    lineHeight: 1.4,
    fontFamily: "Helvetica",
  },
  cover: {
    paddingTop: 100,
    textAlign: "center",
  },
  brand: {
    fontSize: 12,
    color: "#79B669",
    letterSpacing: 4,
    marginBottom: 18,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    color: "#155A03",
    fontWeight: 700,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#1F8505",
    marginBottom: 24,
  },
  meta: {
    fontSize: 10,
    color: "#6E726E",
    marginTop: 60,
  },
  h2: {
    fontSize: 14,
    color: "#155A03",
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
    borderBottom: "1pt solid #DAEDD5",
    paddingBottom: 2,
  },
  row: { flexDirection: "row" },
  cell: { flex: 1, padding: 4 },
  th: {
    backgroundColor: "#F0FDF4",
    color: "#155A03",
    fontWeight: 700,
    borderBottom: "1pt solid #DAEDD5",
  },
  zebra: { backgroundColor: "#FAFEFA" },
  metric: {
    flex: 1,
    padding: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 4,
    marginRight: 6,
  },
  metricLabel: { fontSize: 8, color: "#6E726E", textTransform: "uppercase" },
  metricValue: { fontSize: 16, color: "#155A03", fontWeight: 700, marginTop: 2 },
  small: { fontSize: 8, color: "#AAAAAA" },
  pageNumber: {
    position: "absolute",
    bottom: 18,
    right: 36,
    fontSize: 8,
    color: "#AAAAAA",
  },
});

// ── Common sections ───────────────────────────────────────────────────────

function CoverPage({
  brand,
  title,
  subject,
  period,
  generatedAt,
}: {
  brand: string;
  title: string;
  subject: string;
  period: string;
  generatedAt: string;
}) {
  return (
    <View style={styles.cover}>
      <Text style={styles.brand}>{brand}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subject}</Text>
      <Text style={styles.meta}>{period}</Text>
      <Text style={styles.meta}>Generated: {generatedAt}</Text>
    </View>
  );
}

function ExecutiveSummary({ data }: { data: EmissionReportData | PersonalReportData }) {
  const isOrg = "org" in data;
  return (
    <View>
      <Text style={styles.h2}>Executive Summary</Text>
      <View style={styles.row}>
        <Metric label="Total CO₂e" value={`${data.summary.totalCo2eKg} kg`} />
        <Metric label="Scope 1" value={`${data.summary.scope1Kg} kg`} />
        <Metric label="Scope 2" value={`${data.summary.scope2Kg} kg`} />
        <Metric label="Scope 3" value={`${data.summary.scope3Kg} kg`} />
      </View>
      <View style={[styles.row, { marginTop: 6 }]}>
        <Metric label="Logs" value={String(data.summary.logCount)} />
        {isOrg && (
          <>
            <Metric
              label="Verified"
              value={String((data as EmissionReportData).summary.verifiedCount)}
            />
            <Metric
              label="Pending"
              value={String((data as EmissionReportData).summary.pendingCount)}
            />
            <Metric
              label="Completeness"
              value={`${(data as EmissionReportData).summary.completenessPct}%`}
            />
          </>
        )}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function MonthlyTrendTable({ data }: { data: EmissionReportData | PersonalReportData }) {
  if (data.monthlyTrend.length === 0) return null;
  return (
    <View>
      <Text style={styles.h2}>Monthly Trend</Text>
      <View style={[styles.row, styles.th]}>
        <Text style={styles.cell}>Month</Text>
        <Text style={styles.cell}>Total CO₂e (kg)</Text>
        <Text style={styles.cell}>Log count</Text>
      </View>
      {data.monthlyTrend.map((m, i) => (
        <View
          key={m.month}
          style={i % 2 === 0 ? [styles.row, styles.zebra] : styles.row}
        >
          <Text style={styles.cell}>{m.month}</Text>
          <Text style={styles.cell}>{m.total_co2e_kg}</Text>
          <Text style={styles.cell}>{m.log_count}</Text>
        </View>
      ))}
    </View>
  );
}

function CategoryTable({ data }: { data: EmissionReportData | PersonalReportData }) {
  if (data.byCategory.length === 0) return null;
  return (
    <View>
      <Text style={styles.h2}>Top Categories</Text>
      <View style={[styles.row, styles.th]}>
        <Text style={styles.cell}>Category</Text>
        <Text style={styles.cell}>CO₂e (kg)</Text>
        <Text style={styles.cell}>Share %</Text>
      </View>
      {data.byCategory.map((c, i) => (
        <View
          key={c.name}
          style={i % 2 === 0 ? [styles.row, styles.zebra] : styles.row}
        >
          <Text style={styles.cell}>{c.name}</Text>
          <Text style={styles.cell}>{c.co2e_kg}</Text>
          <Text style={styles.cell}>{c.share_pct}</Text>
        </View>
      ))}
    </View>
  );
}

function MethodologyNotes() {
  return (
    <View>
      <Text style={styles.h2}>Methodology</Text>
      <Text>
        Calculations follow the GHG Protocol Corporate Standard. Emission
        factors are frozen at the time each activity was logged (BR-06): updates
        to global factors do not retroactively change historical results.
        Activities marked Published or Exported are immutable (BR-07). Audit
        events are recorded immutably (BR-16).
      </Text>
    </View>
  );
}

function ComplianceChecklistView({
  items,
}: {
  items: ComplianceChecklistItem[];
}) {
  return (
    <View>
      <Text style={styles.h2}>Compliance Checklist</Text>
      {items.map((item, i) => (
        <View
          key={item.id}
          style={i % 2 === 0 ? [styles.row, styles.zebra] : styles.row}
        >
          <Text style={[styles.cell, { flex: 5 }]}>{item.labelKey}</Text>
          <Text
            style={[
              styles.cell,
              {
                flex: 1,
                color: item.passed ? "#1F8505" : "#B91C1C",
                fontWeight: 700,
              },
            ]}
          >
            {item.passed ? "PASS" : "ATTENTION"}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Public Documents ──────────────────────────────────────────────────────

export function EmissionReportDocument({ data }: { data: EmissionReportData }) {
  const periodStr = `${data.period.start} → ${data.period.end}`;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <CoverPage
          brand="ECOWISE EMISSION REPORT"
          title="Emission Log Report"
          subject={data.org.legal_name}
          period={periodStr}
          generatedAt={data.generatedAt}
        />
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
      <Page size="A4" style={styles.page}>
        <ExecutiveSummary data={data} />
        <MonthlyTrendTable data={data} />
        <CategoryTable data={data} />
        <MethodologyNotes />
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

export function ComplianceReportDocument({
  data,
}: {
  data: ComplianceReportData;
}) {
  const periodStr = `${data.period.start} → ${data.period.end}`;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <CoverPage
          brand={`ECOWISE COMPLIANCE — ${data.regulation.replace("_", " ")}`}
          title="Compliance Report"
          subject={data.org.legal_name}
          period={periodStr}
          generatedAt={data.generatedAt}
        />
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
      <Page size="A4" style={styles.page}>
        <ExecutiveSummary data={data} />
        <ComplianceChecklistView items={data.checklist} />
        <MonthlyTrendTable data={data} />
        <CategoryTable data={data} />
        <MethodologyNotes />
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

export function PersonalReportDocument({ data }: { data: PersonalReportData }) {
  const periodStr = `${data.period.start} → ${data.period.end}`;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <CoverPage
          brand="ECOWISE PERSONAL REPORT"
          title="Personal Carbon Report"
          subject={data.user.full_name ?? data.user.email}
          period={periodStr}
          generatedAt={data.generatedAt}
        />
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
      <Page size="A4" style={styles.page}>
        <ExecutiveSummary data={data} />
        <MonthlyTrendTable data={data} />
        <CategoryTable data={data} />
        <MethodologyNotes />
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
