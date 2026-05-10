import { PageHeader } from "@/components/shared/PageHeader";
import { CompareView } from "./_components/CompareView";

export default function ComparePage() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <PageHeader titleKey="page.compare.title" subtitleKey="page.compare.subtitle" />
      <CompareView />
    </div>
  );
}
