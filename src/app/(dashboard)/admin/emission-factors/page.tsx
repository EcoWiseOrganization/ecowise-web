import { PageHeader } from "../_components/PageHeader";
import {
  getEmissionFactorsAction,
  getEmissionCategoriesAction,
} from "@/app/actions/sustainability.actions";
import { EFManagementView } from "./_components/EFManagementView";

export const metadata = { title: "Emission Factors – EcoWise Admin" };

export default async function EmissionFactorsPage() {
  const [factors, categories] = await Promise.all([
    getEmissionFactorsAction(),
    getEmissionCategoriesAction(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="admin.emissionFactors.title"
        subtitleKey="admin.emissionFactors.subtitle"
      />
      <EFManagementView initialFactors={factors} categories={categories} />
    </div>
  );
}
