import { PageHeader } from "@/components/shared/PageHeader";
import { RecommendationsList } from "./_components/RecommendationsList";

export default function RecommendationsPage() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <PageHeader
        titleKey="page.recommendations.title"
        subtitleKey="page.recommendations.subtitle"
      />
      <RecommendationsList />
    </div>
  );
}
