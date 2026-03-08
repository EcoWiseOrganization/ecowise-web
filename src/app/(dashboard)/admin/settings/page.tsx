import { PageHeader } from "../_components/PageHeader";

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Cấu hình hệ thống"
      />
      <div className="p-12 bg-white rounded-3xl border border-[#B8D6B0] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] flex items-center justify-center">
        <p className="text-[#6E726E] text-sm">Coming soon</p>
      </div>
    </div>
  );
}
