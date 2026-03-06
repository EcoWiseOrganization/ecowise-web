import { EMISSION_HOTSPOTS } from "../_data/mock";

export function EmissionHotspots() {
  const { title, subtitle, categories, legend } = EMISSION_HOTSPOTS;

  return (
    <div className="p-8 bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] rounded-3xl border border-[#B8D6B0] flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-[#145A03] text-lg font-extrabold leading-7">
            {title}
          </h2>
          <p className="text-[#6E726E] text-sm font-normal leading-5 font-[Manrope]">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {legend.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[#7AB669] text-xs font-bold leading-4">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Area (placeholder) */}
      <div className="relative h-[236px]">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between py-2 opacity-5">
          <div className="h-px border-t border-[#145A03]" />
          <div className="h-px border-t border-[#145A03]" />
          <div className="h-px border-t border-[#145A03]" />
        </div>

        {/* Placeholder chart visualization */}
        <div className="absolute inset-x-[50px] top-[30px] h-[170px] border-2 border-[#7AB669] rounded" />
      </div>

      {/* X-axis Labels */}
      <div className="flex border-t border-[#79B669]">
        {categories.map((cat) => (
          <div key={cat} className="flex-1 pt-3 flex justify-center">
            <span className="text-[#79B669] text-[10px] font-bold leading-[15px] text-center">
              {cat}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
