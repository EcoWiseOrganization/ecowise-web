import PeopleIcon from "@mui/icons-material/People";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { getUserStats } from "@/services/user.service";
import { PageHeader } from "./_components/PageHeader";
import { StatsCard } from "./_components/StatsCard";

export default async function AdminDashboardPage() {
  const { totalUsers, adminCount, activeCount } = await getUserStats();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Admin Dashboard"
        description="Tổng quan hệ thống và quản lý người dùng"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        <StatsCard
          title="Total Users"
          value={totalUsers}
          icon={PeopleIcon}
        />
        <StatsCard
          title="Admins"
          value={adminCount}
          icon={AdminPanelSettingsIcon}
          color="#856404"
        />
        <StatsCard
          title="Active Users"
          value={activeCount}
          icon={CheckCircleIcon}
          color="#1F8505"
        />
      </div>

      {/* Auth Test Result */}
      <div className="p-6 bg-[#DAEDD5] rounded-3xl border border-[#B8D6B0] flex flex-col gap-3">
        <h2 className="text-[#155A03] text-xl font-semibold">
          Kết quả kiểm tra phân quyền
        </h2>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#1F8505]" />
          <span className="text-[#155A03] text-base">
            Bạn có quyền <strong>Admin</strong> — Truy cập trang này thành công.
          </span>
        </div>
        <p className="text-[#6E726E] text-sm">
          User không có is_admin = true sẽ bị middleware redirect về /dashboard.
        </p>
      </div>
    </div>
  );
}
