import PeopleIcon from "@mui/icons-material/People";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { getUserStats } from "@/services/user.service";
import { PageHeader } from "./_components/PageHeader";
import { StatsCard } from "./_components/StatsCard";
import { AdminAuthBanner } from "./_components/AdminAuthBanner";

export default async function AdminDashboardPage() {
  const { totalUsers, adminCount, activeCount } = await getUserStats();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="admin.dashboard.title"
        subtitleKey="admin.dashboard.subtitle"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        <StatsCard
          titleKey="admin.dashboard.stats.totalUsers"
          value={totalUsers}
          icon={PeopleIcon}
        />
        <StatsCard
          titleKey="admin.dashboard.stats.admins"
          value={adminCount}
          icon={AdminPanelSettingsIcon}
          color="#856404"
        />
        <StatsCard
          titleKey="admin.dashboard.stats.activeUsers"
          value={activeCount}
          icon={CheckCircleIcon}
          color="#1F8505"
        />
      </div>

      <AdminAuthBanner />
    </div>
  );
}
