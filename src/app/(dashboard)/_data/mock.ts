export const WORKSPACE = {
  name: "FDI Tech Corp",
  location: "Vietnam HQ",
};

export const USER_PROFILE = {
  name: "Khoi Nguyen",
  role: "Sustainability Lead",
  avatar: "/img/avatar-placeholder.png",
};

export const AUDIT_CYCLE = "FY 2024 Audit Cycle";
export const DATE_RANGE = "Jan 1, 2024 - Dec 31, 2024";

export const SUMMARY_STATS = {
  totalFootprint: {
    value: "2,482",
    unit: "tCO2e",
    change: "+12.4%",
    note: "Across all scopes",
    trend: "up" as const,
  },
  scope1: {
    value: "412",
    unit: "tCO2e",
    status: "On Track",
    percentage: 16,
  },
  scope2: {
    locationBased: { value: "840", unit: "tCO2e" },
    marketBased: { value: "620", unit: "tCO2e" },
    note: "iREC Certifications applied to Vietnam grid usage.",
  },
  scope3: {
    value: "1,450",
    unit: "tCO2e",
    hotspot: "Goods",
    percentOfTotal: 58,
  },
};

export const EMISSION_HOTSPOTS = {
  title: "Emission Hotspots",
  subtitle: "Identification of top 80% contributors",
  categories: ["Electricity", "Freight", "Travel", "Waste", "Cooling"],
  legend: [
    { label: "Mass (tCO2e)", color: "#155A03" },
    { label: "Cumulative %", color: "#79B669" },
  ],
};

export const SCOPE3_COMPOSITION = {
  title: "Scope 3 Composition",
  subtitle: "Detailed category breakdown by relevance",
  methodology: "Methodology: GHG Protocol",
  categories: [
    {
      icon: "package",
      label: "Category 1: Purchased Goods & Services",
      value: 725,
      unit: "tCO2e",
      percentage: 50,
      segments: [
        { width: "50%", color: "#155A03" },
        { width: "30%", color: "#79B669" },
        { width: "20%", color: "#B8D6B0" },
      ],
    },
    {
      icon: "plane",
      label: "Category 6: Business Travel",
      value: 435,
      unit: "tCO2e",
      percentage: 30,
      badge: { text: "RFI 2.0", color: "warning" as const },
      barColor: "#95C289",
    },
    {
      icon: "car",
      label: "Category 7: Employee Commuting",
      value: 210,
      unit: "tCO2e",
      percentage: 15,
      barColor: "#79B669",
    },
    {
      icon: "more",
      label: "Other (Waste, Transport, Fuel-related)",
      value: 80,
      unit: "tCO2e",
      percentage: 5,
      barColor: "#79B669",
    },
  ],
  footer: [
    { label: "Data Quality", value: "Tier 1: 42%", color: "#95C289" },
    { label: "Supplier Engagement", value: "12 / 85 Active", color: "#145A03" },
    { label: "Inventory Range", value: "Upstream Focus", color: "#145A03" },
    { label: "Last Computed", value: "2h ago", color: "#145A03" },
  ],
};

export const NET_ZERO = {
  title: "Net Zero 2050",
  subtitle: "Global Commitment",
  reductionAchieved: "28.4%",
  baseline: "2024 Baseline",
  target: "Target: -50% by 2030",
  progressPercent: 28.4,
  stats: [
    { label: "Current Year", value: "-4.2% YoY" },
    { label: "Offset Ratio", value: "1:12 Verified" },
  ],
};

export const INTENSITY_METRICS = [
  { label: "tCO2e / $1M Revenue", value: "0.42", progress: 42, color: "#155A03" },
  { label: "tCO2e / Full-time Employee", value: "1.8", progress: 18, color: "#155A03" },
  { label: "tCO2e / m² Office Space", value: "2.1", progress: 65, color: "#95C289" },
];

export const COMPLIANCE = {
  title: "Reporting Compliance",
  description:
    "Your data currently aligns with GRI and TCFD standards for Vietnam SEC\nrequirements.",
  action: "Download Audit Pack",
};

export const RECENT_ENTRIES = {
  columns: ["Asset / Activity", "Category", "Quantity", "Status"],
  rows: [
    {
      asset: "Warehouse B - HVAC",
      location: "Ho Chi Minh City",
      category: "Scope 1\n(Refrigerants)",
      quantity: "2.4 tCO2e",
      status: "Verified",
      statusColor: "success" as const,
    },
    {
      asset: "Freight Forwarding\n(SGN-HAN)",
      location: "Vendor: SME Logistics",
      category: "Scope 3\n(Upstream)",
      quantity: "14.8 tCO2e",
      status: "Pending Review",
      statusColor: "warning" as const,
    },
  ],
};
