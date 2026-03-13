import { PageHeader } from "@/components/shared/PageHeader";
import { T } from "@/components/shared/TranslatedText";

export default function HelpDeskPage() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <PageHeader titleKey="page.help.title" subtitleKey="page.help.subtitle" />
      <div className="p-12 bg-white rounded-3xl border border-[#B8D6B0] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] flex items-center justify-center">
        <p className="text-[#6E726E] text-sm"><T k="common.comingSoon" /></p>
      </div>
    </div>
  );
}
