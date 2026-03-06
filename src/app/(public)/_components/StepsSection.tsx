const STEPS = [
  {
    number: "01",
    title: "Sign Up & Set Up",
    description:
      "Create your account and configure your organization's structure, operational scope, and reporting boundaries.",
    width: "w-[237px]",
  },
  {
    number: "02",
    title: "Data Collection",
    description:
      "Input operational data including energy consumption, transportation, waste, and supply chain activities.",
    width: "w-[238px]",
  },
  {
    number: "03",
    title: "Calculation & Analysis",
    description:
      "The system automatically calculates emissions by Scope 1, 2, and 3, and identifies key carbon hotspots.",
    width: "w-[238px]",
  },
  {
    number: "04",
    title: "Reporting & Action",
    description:
      "Generate compliance-ready reports, build emission reduction plans, and track your progress toward Net Zero.",
    width: "w-[237px]",
  },
];

export function StepsSection() {
  return (
    <section className="w-full py-[100px]">
      <div className="max-w-[1200px] mx-auto flex flex-col items-start gap-20">
        {/* Banner Title */}
        <div className="inline-flex items-center justify-center px-[97px] py-5 bg-[linear-gradient(270deg,#B8D6B0_0%,#79B669_98%)] shadow-[0px_4px_4px_rgba(218,237,213,0.25)] rounded-3xl">
          <h2 className="text-center text-white text-4xl font-bold leading-[56px]">
            4 Simple Steps To Start Managing Your Carbon
          </h2>
        </div>

        {/* Steps Row */}
        <div className="self-stretch relative inline-flex items-center justify-center gap-[84px] h-[216px]">
          {/* Connecting Line */}
          <div className="absolute left-[31px] top-[33px] w-[966px] h-0 outline outline-2 outline-[#155A03] outline-offset-[-1px]" />

          {STEPS.map((step) => (
            <div
              key={step.number}
              className={`${step.width} inline-flex flex-col items-start gap-5`}
            >
              {/* Number Badge */}
              <div className="relative z-10 w-[66px] h-[66px] p-2.5 bg-[linear-gradient(270deg,#B8D6B0_0%,#79B669_98%)] rounded-xl flex flex-col items-center justify-center gap-2.5">
                <span className="self-stretch text-center text-white text-[30px] font-bold leading-[56px]">
                  {step.number}
                </span>
              </div> 

              {/* Text */}
              <div className="self-stretch flex flex-col items-start gap-2.5">
                <h3 className="self-stretch text-[#104502] text-xl font-semibold leading-6">
                  {step.title}
                </h3>
                <p className="self-stretch text-[#155A03] text-base font-normal leading-6">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
