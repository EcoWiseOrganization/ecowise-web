import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { SUMMARY_STATS } from "../../_data/mock";

export function TotalFootprintCard() {
  const { totalFootprint } = SUMMARY_STATS;

  return (
    <div className="flex-1 p-6 bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] overflow-hidden rounded-2xl border border-[#B8D6B0] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[#3B3D3B] text-xs font-bold uppercase leading-4 tracking-[0.6px]">
          Total Footprint
        </span>
        <span className="px-2 py-1 bg-[#79B669] rounded-full text-white text-[10px] font-bold leading-[15px]">
          {totalFootprint.change}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-[#1F8505] text-4xl font-extrabold leading-10">
          {totalFootprint.value}
        </span>
        <span className="text-[#AAAAAA] text-base font-bold leading-6">
          {totalFootprint.unit}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <TrendingUpIcon sx={{ fontSize: 12, color: "#FF9092" }} />
        <span className="text-[#FF9092] text-xs font-normal leading-4 font-[Manrope]">
          {totalFootprint.note}
        </span>
      </div>
    </div>
  );
}
