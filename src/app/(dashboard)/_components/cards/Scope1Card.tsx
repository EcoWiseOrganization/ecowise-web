import { SUMMARY_STATS } from "../../_data/mock";

export function Scope1Card() {
  const { scope1 } = SUMMARY_STATS;

  return (
    <div className="min-w-0 p-4 sm:p-6 bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] rounded-2xl border border-[#B8D6B0] flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[#3B3D3B] text-xs font-bold uppercase leading-4 tracking-[0.6px] truncate">
          Scope 1 (Direct)
        </span>
        <span className="shrink-0 px-2 py-1 bg-[#DAEDD5] rounded-full text-[#1F8505] text-[10px] font-bold leading-[15px]">
          {scope1.status}
        </span>
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[#1F8505] text-2xl sm:text-3xl xl:text-4xl font-extrabold leading-tight">
          {scope1.value}
        </span>
        <span className="text-[#AAAAAA] text-base font-bold leading-6">
          {scope1.unit}
        </span>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 h-1.5 bg-[#DAEDD5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1F8505] rounded-full"
            style={{ width: `${scope1.percentage}%` }}
          />
        </div>
        <span className="shrink-0 text-[#3B3D3B] text-[10px] font-bold leading-[15px]">
          {scope1.percentage}% of total
        </span>
      </div>
    </div>
  );
}
