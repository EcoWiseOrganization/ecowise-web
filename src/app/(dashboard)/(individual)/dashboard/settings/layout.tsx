import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsTabs } from "./_components/SettingsTabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pt-6">
      <PageHeader titleKey="page.settings.title" subtitleKey="page.settings.subtitle" />
      <SettingsTabs />
      {children}
    </div>
  );
}
