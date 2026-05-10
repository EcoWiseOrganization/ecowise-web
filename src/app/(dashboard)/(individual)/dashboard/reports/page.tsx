import { PageHeader } from "@/components/shared/PageHeader";
import { PersonalReport } from "./_components/PersonalReport";

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <PageHeader titleKey="page.reports.title" subtitleKey="page.reports.subtitle" />
      <PersonalReport />
    </div>
  );
}
