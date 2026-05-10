import { PageHeader } from "@/components/shared/PageHeader";
import { TargetsView } from "./_components/TargetsView";

export default function TargetsPage() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <PageHeader titleKey="page.targets.title" subtitleKey="page.targets.subtitle" />
      <TargetsView />
    </div>
  );
}
