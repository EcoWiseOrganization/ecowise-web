import DescriptionIcon from "@mui/icons-material/Description";
import { COMPLIANCE } from "../_data/mock";

export function ReportingCompliance() {
  return (
    <div className="p-6 bg-[#DAEDD5] rounded-3xl border border-[#79B669]">
      <div className="flex items-start gap-4">
        <div className="pt-1">
          <DescriptionIcon sx={{ fontSize: 18, color: "#155A03" }} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[#145A03] text-sm font-bold leading-5">
            {COMPLIANCE.title}
          </span>
          <p className="text-[#475569] text-xs font-normal leading-4 font-[Manrope] pb-2 whitespace-pre-line">
            {COMPLIANCE.description}
          </p>
          <button className="text-[#155A03] text-xs font-bold leading-4 bg-transparent border-none p-0 cursor-pointer hover:underline text-left">
            {COMPLIANCE.action}
          </button>
        </div>
      </div>
    </div>
  );
}
