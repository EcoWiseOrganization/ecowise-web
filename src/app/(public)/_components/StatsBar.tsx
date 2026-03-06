const STATS = [
  { value: "50+", label: "Organizations Onboarded" },
  { value: "300+", label: "Carbon Reports Generated" },
  { value: "24/7", label: "Real-time Monitoring" },
  { value: "100%", label: "Automated Data Processing" },
];

export function StatsBar() {
  return (
    <section className="w-[1400px] mx-auto mb-[60px]">
      <div className="w-full h-[104px] px-8 py-5 bg-white shadow-[0px_2px_4px_rgba(218,237,213,0.25)] rounded-3xl border border-[#DAEDD5] flex items-center justify-center">
        <div className="flex items-center gap-[60px]">
          {STATS.map((stat, index) => (
            <div key={stat.label} className="flex items-center gap-[60px]">
              <div className="flex flex-col items-start justify-start gap-1.5">
                <span className="text-[#155A03] text-2xl font-bold">
                  {stat.value}
                </span>
                <span className="text-[#79B669] text-base font-medium">
                  {stat.label}
                </span>
              </div>
              {index < STATS.length - 1 && (
                <div className="w-px h-[54px] bg-[#DAEDD5]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
