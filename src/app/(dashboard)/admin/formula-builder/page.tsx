import { PageHeader } from "../_components/PageHeader";
import {
  getEmissionCategoriesAction,
  getEmissionFactorsAction,
  getCalculationTemplatesAction,
} from "@/app/actions/sustainability.actions";
import { FormulaBuilderView } from "./_components/FormulaBuilderView";

export const metadata = { title: "Formula Builder – EcoWise Admin" };

export default async function FormulaBuilderPage() {
  const [categories, factors, templates] = await Promise.all([
    getEmissionCategoriesAction(),
    getEmissionFactorsAction(),
    getCalculationTemplatesAction(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="admin.formulaBuilder.title"
        subtitleKey="admin.formulaBuilder.subtitle"
      />
      <FormulaBuilderView
        categories={categories}
        factors={factors}
        initialTemplates={templates}
      />
    </div>
  );
}
