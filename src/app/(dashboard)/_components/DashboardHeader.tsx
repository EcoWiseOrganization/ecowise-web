import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AddIcon from "@mui/icons-material/Add";
import { AUDIT_CYCLE, DATE_RANGE } from "../_data/mock";

export function DashboardHeader() {
  return (
    <div className="flex items-start justify-between">
      <div className="flex flex-col">
        <h1 className="text-[#155A03] text-[30px] font-semibold leading-9">
          Executive Dashboard
        </h1>
        <p className="text-base">
          <span className="text-[#AAAAAA] font-medium leading-6">
            Monitoring carbon performance for{" "}
          </span>
          <span className="text-[#79B669] font-bold">{AUDIT_CYCLE}</span>
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Range Picker */}
        <button className="h-11 px-4 py-2 bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] rounded-xl border border-[#E2E8F0] flex items-center gap-3 cursor-pointer">
          <CalendarTodayIcon sx={{ fontSize: 20, color: "#79B669" }} />
          <span className="text-[#155A03] text-sm leading-5">
            {DATE_RANGE}
          </span>
          <KeyboardArrowDownIcon sx={{ fontSize: 11, color: "#79B669" }} />
        </button>

        {/* Add Emission Button */}
        <button className="relative px-6 py-2.5 bg-[#1F8505] rounded-xl flex items-center gap-2 shadow-[0px_2px_4px_rgba(218,237,213,0.25)] cursor-pointer border-none hover:brightness-110 transition-all">
          <AddIcon sx={{ fontSize: 14, color: "white" }} />
          <span className="text-white text-base font-bold leading-6">
            Add Emission
          </span>
        </button>
      </div>
    </div>
  );
}
