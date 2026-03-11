const STATS = [
  { value: "50+", label: "Organizations Onboarded" },
  { value: "300+", label: "Carbon Reports Generated" },
  { value: "24/7", label: "Real-time Monitoring" },
  { value: "100%", label: "Automated Data Processing" },
];

export function StatsBar() {
  return (
    <section className="w-full max-w-[1400px] mx-auto mb-10 lg:mb-[60px] px-4 sm:px-6 lg:px-0">
      <div className="w-full px-6 py-5 sm:py-6 lg:h-[104px] bg-white shadow-[0px_2px_4px_rgba(218,237,213,0.25)] rounded-2xl lg:rounded-3xl border border-[#DAEDD5] flex items-center justify-center">
        <div className="grid grid-cols-2 lg:flex lg:items-center gap-6 sm:gap-8 lg:gap-[60px] w-full lg:w-auto">
          {STATS.map((stat, index) => (
            <div key={stat.label} className="flex lg:items-center lg:gap-[60px]">
              <div className="flex flex-col items-start gap-1 sm:gap-1.5">
                <span className="text-[#155A03] text-xl sm:text-2xl font-bold">
                  {stat.value}
                </span>
                <span className="text-[#79B669] text-xs sm:text-base font-medium leading-snug">
                  {stat.label}
                </span>
              </div>
              {index < STATS.length - 1 && (
                <div className="hidden lg:block w-px h-[54px] bg-[#DAEDD5] ml-[60px]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
