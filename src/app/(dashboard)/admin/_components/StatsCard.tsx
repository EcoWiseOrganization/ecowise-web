import type { SvgIconComponent } from "@mui/icons-material";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: SvgIconComponent;
  color?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  color = "#155A03",
}: StatsCardProps) {
  return (
    <div className="p-6 bg-white rounded-3xl border border-[#B8D6B0] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon sx={{ fontSize: 24, color }} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[#AAAAAA] text-sm">{title}</span>
        <span className="text-[#155A03] text-2xl font-bold">{value}</span>
      </div>
    </div>
  );
}
