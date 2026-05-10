import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityLogger } from "./_components/ActivityLogger";

export default function ActivityPage() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <PageHeader titleKey="page.activity.title" subtitleKey="page.activity.subtitle" />
      <ActivityLogger />
    </div>
  );
}
