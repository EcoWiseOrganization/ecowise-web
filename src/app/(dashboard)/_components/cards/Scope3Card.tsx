import ShowChartIcon from "@mui/icons-material/ShowChart";
import { SUMMARY_STATS } from "../../_data/mock";

export function Scope3Card() {
  const { scope3 } = SUMMARY_STATS;

  return (
    <div className="flex-1 p-6 bg-[linear-gradient(135deg,white_0%,rgba(248,250,252,0.5)_100%)] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] rounded-2xl border border-[#B8D6B0] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[#3B3D3B] text-xs font-bold uppercase leading-4 tracking-[0.6px]">
          Scope 3 (Chain)
        </span>
        <ShowChartIcon sx={{ fontSize: 15, color: "#79B669" }} />
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-[#1F8505] text-4xl font-extrabold leading-10">
          {scope3.value}
        </span>
        <span className="text-[#AAAAAA] text-base font-bold leading-6">
          {scope3.unit}
        </span>
      </div>

      <div className="flex items-start gap-2">
        <span className="px-2 py-0.5 bg-[#DAEDD5] rounded text-[#1F8505] text-[9px] font-bold uppercase leading-[13.5px]">
          Hotspot: {scope3.hotspot}
        </span>
        <span className="px-2 py-0.5 bg-[#79B669] rounded text-white text-[9px] font-bold leading-[13.5px]">
          {scope3.percentOfTotal}% of Total
        </span>
      </div>
    </div>
  );
}
