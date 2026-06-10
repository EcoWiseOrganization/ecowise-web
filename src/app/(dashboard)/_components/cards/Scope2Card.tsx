import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { SUMMARY_STATS } from "../../_data/mock";

export function Scope2Card() {
  const { scope2 } = SUMMARY_STATS;

  return (
    <div className="min-w-0 p-4 sm:p-6 bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] rounded-2xl border border-[#B8D6B0] flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[#3B3D3B] text-xs font-bold uppercase leading-4 tracking-[0.6px] truncate">
          Scope 2 (Indirect)
        </span>
        <FiberManualRecordIcon sx={{ fontSize: 8, color: "#1F8505" }} className="shrink-0" />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Location-based */}
        <div className="flex flex-col min-w-0">
          <span className="text-[#AAAAAA] text-[10px] font-bold uppercase leading-[15px] pb-2">
            Location-based
          </span>
          <span className="text-[#1F8505] text-xl sm:text-2xl font-extrabold leading-8">
            {scope2.locationBased.value}
          </span>
          <span className="text-[#AAAAAA] text-xs font-normal leading-4 font-[Manrope]">
            {scope2.locationBased.unit}
          </span>
        </div>

        {/* Divider + Market-based */}
        <div className="pl-4 border-l border-[#DAEDD5] flex flex-col items-end min-w-0">
          <span className="text-[#1F8505] text-[10px] font-bold uppercase leading-[15px] pb-2 text-right">
            Market-based
          </span>
          <span className="text-[#1F8505] text-xl sm:text-2xl font-extrabold leading-8 text-right">
            {scope2.marketBased.value}
          </span>
          <span className="text-[#AAAAAA] text-xs font-normal leading-4 font-[Manrope] text-right">
            {scope2.marketBased.unit}
          </span>
        </div>
      </div>

      <div className="p-2 bg-[#DAEDD5] rounded-lg">
        <p className="text-[#6E726E] text-[10px] font-medium leading-[15px] font-[Manrope]">
          {scope2.note}
        </p>
      </div>
    </div>
  );
}
