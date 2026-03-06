import PublicIcon from "@mui/icons-material/Public";
import { NET_ZERO } from "../_data/mock";

export function NetZeroCard() {
  const { title, subtitle, reductionAchieved, baseline, target, progressPercent, stats } =
    NET_ZERO;

  return (
    <div className="p-8 bg-[#79B669] rounded-3xl border border-[#B8D6B0] flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#155A03] rounded-full flex items-center justify-center">
          <PublicIcon sx={{ fontSize: 17, color: "white" }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-white text-xl font-extrabold leading-[25px]">
            {title}
          </span>
          <span className="text-[#3B3D3B] text-xs font-bold uppercase leading-4 tracking-[1.2px]">
            {subtitle}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-6">
        {/* Percentage + Baseline */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-white text-[30px] font-extrabold leading-9">
              {reductionAchieved}
            </span>
            <span className="text-[#3B3D3B] text-xs font-medium leading-4 font-[Manrope]">
              Reduction achieved
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-white text-sm font-bold leading-5">
              {baseline}
            </span>
            <span className="text-[#141514] text-xs font-normal leading-4 font-[Manrope]">
              {target}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-4 bg-[#E5E5E5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#155A03] rounded-full shadow-[0px_0px_15px_rgba(25,230,107,0.4)]"
            style={{ width: `${progressPercent}%` }}
          />
          {/* 50% marker */}
          <div className="absolute top-0 h-full w-0.5 bg-white/50" style={{ left: "50%" }} />
        </div>

        {/* Stat Cards */}
        <div className="flex gap-4">
          {stats.map(({ label, value }) => (
            <div
              key={label}
              className="flex-1 p-4 bg-white/80 rounded-2xl flex flex-col gap-1"
            >
              <span className="text-[#3B3D3B] text-[10px] font-bold uppercase leading-[15px]">
                {label}
              </span>
              <span className="text-[#155A03] text-sm font-bold leading-5">
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button className="w-full py-3 bg-[#155A03] rounded-xl text-white text-sm font-bold leading-5 text-center border-none cursor-pointer hover:brightness-110 transition-all">
          View Roadmap Detail
        </button>
      </div>
    </div>
  );
}
