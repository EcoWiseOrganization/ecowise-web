import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import FlightIcon from "@mui/icons-material/Flight";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { SCOPE3_COMPOSITION } from "../_data/mock";

const ICON_MAP: Record<string, typeof LocalShippingIcon> = {
  package: LocalShippingIcon,
  plane: FlightIcon,
  car: DirectionsCarIcon,
  more: MoreHorizIcon,
};

export function Scope3Composition() {
  const { title, subtitle, methodology, categories, footer } = SCOPE3_COMPOSITION;

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
        <span className="px-3 py-1 bg-[#B8D6B0] rounded-lg border border-[#E2E8F0] text-[#7AB669] text-xs font-bold leading-4">
          {methodology}
        </span>
      </div>

      {/* Category Bars */}
      <div className="flex flex-col gap-6">
        {categories.map((cat) => {
          const Icon = ICON_MAP[cat.icon];
          return (
            <div key={cat.label} className="flex flex-col gap-2">
              {/* Label Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon sx={{ fontSize: 20, color: "#6E726E" }} />
                  <span className="text-[#145A03] text-sm font-bold leading-5">
                    {cat.label}
                  </span>
                  {cat.badge && (
                    <span className="px-1.5 py-0.5 bg-[#FEF3C7] rounded text-[#D97706] text-[9px] font-extrabold leading-[13.5px]">
                      {cat.badge.text}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline">
                  <span className="text-[#145A03] text-sm font-extrabold leading-5">
                    {cat.value}{" "}
                  </span>
                  <span className="text-[#6E726E] text-xs font-medium leading-4 font-[Manrope]">
                    {cat.unit}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-8 bg-[#E5E5E5] rounded-lg overflow-hidden flex">
                {cat.segments ? (
                  cat.segments.map((seg, i) => (
                    <div
                      key={i}
                      className="h-full flex items-center"
                      style={{
                        width: seg.width,
                        backgroundColor: seg.color,
                        borderRight:
                          i < cat.segments!.length - 1
                            ? "1px solid rgba(255,255,255,0.1)"
                            : undefined,
                        borderTopLeftRadius: i === 0 ? "8px" : undefined,
                        borderBottomLeftRadius: i === 0 ? "8px" : undefined,
                      }}
                    >
                      {i === 0 && (
                        <span className="pl-2 text-[#145A03] text-[10px] font-bold leading-[15px] opacity-60">
                          {cat.percentage}%
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div
                    className="h-full rounded-lg flex items-center"
                    style={{
                      width: `${cat.percentage * 2}%`,
                      backgroundColor: cat.barColor,
                    }}
                  >
                    <span className="pl-2 text-white text-[10px] font-bold leading-[15px]">
                      {cat.percentage}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="pt-6 border-t border-[#B8D6B0] flex items-start gap-4">
        {footer.map(({ label, value, color }) => (
          <div key={label} className="flex-1 flex flex-col">
            <span className="text-[#6E726E] text-[10px] font-bold uppercase leading-[15px]">
              {label}
            </span>
            <span
              className="text-xs font-bold leading-4"
              style={{ color }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
