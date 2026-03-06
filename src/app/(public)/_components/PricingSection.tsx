import Link from "next/link";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description: string;
  buttonText: string;
  buttonVariant: "outline" | "filled";
  features: string[];
  highlighted?: boolean;
}

const PLANS: PricingPlan[] = [
  {
    name: "Eco-Individual Free",
    price: "$0",
    description: "Perfect for beginners tracking daily emissions.",
    buttonText: "Try for Free",
    buttonVariant: "outline",
    features: [
      "Manual emission log",
      "Basic travel tracking",
      "Community challenges",
      "Leaderboard comparison",
    ],
  },
  {
    name: "Eco-Professional",
    price: "$000",
    period: "/ Quarter",
    description:
      "Best for growing businesses needing automation and ESG reporting.",
    buttonText: "Start Professional Plan",
    buttonVariant: "filled",
    features: [
      "Bulk data upload (Excel/CSV)",
      "Travel emission tracking",
      "Real-time dashboard (<500n)",
      "Standard ESG export reports",
    ],
    highlighted: true,
  },
  {
    name: "Eco-Starter",
    price: "$00",
    period: "/ Quarter",
    description:
      "Best for growing businesses needing automation and ESG reporting.",
    buttonText: "Get Started",
    buttonVariant: "outline",
    features: [
      "Scope 1 & 2 emission calculation",
      "Vietnamese emission factors",
      "Basic emission dashboard",
      "Small event tracking (<100n)",
    ],
  },
];

function PricingCard({ plan }: { plan: PricingPlan }) {
  const isHighlighted = plan.highlighted;

  return (
    <div
      className={`w-[387px] rounded-3xl flex flex-col ${
        isHighlighted
          ? "bg-[linear-gradient(192deg,rgba(255,255,255,0)_0%,#1F8505_100%),linear-gradient(54deg,rgba(255,255,255,0)_0%,#1F8505_100%),white] shadow-[0px_4px_4px_rgba(31,133,5,0.25)] border border-[#1F8505]"
          : "bg-white shadow-[0px_4px_4px_rgba(218,237,213,0.25)] border border-[#DAEDD5]"
      }`}
    >
      {/* Top Section */}
      <div className="px-[33px] pt-9 pb-8 overflow-hidden rounded-t-3xl flex flex-col gap-[42px]">
        <div className="flex flex-col gap-[42px]">
          <div className="flex flex-col gap-12">
            <h3 className="text-[#1F8505] text-2xl font-medium leading-[27.6px]">
              {plan.name}
            </h3>
            <div className="flex items-end gap-2">
              <span className="text-[#1F8505] text-[60px] font-semibold leading-[69px]">
                {plan.price}
              </span>
              {plan.period && (
                <span className="text-[#6E726E] text-base font-normal leading-[18.4px]">
                  {plan.period}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-[42px]">
            <p className="text-[#6E726E] text-base font-normal leading-6">
              {plan.description}
            </p>
            <Link
              href="/register"
              className={`w-full text-center px-5 py-[18px] rounded-xl text-lg font-medium no-underline shadow-[0px_2px_4px_rgba(218,237,213,0.25)] border border-[#DAEDD5] ${
                plan.buttonVariant === "filled"
                  ? "bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white"
                  : "bg-white text-[#1F8505]"
              }`}
            >
              {plan.buttonText}
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="w-full px-[33px] pt-8 pb-9 overflow-hidden rounded-b-3xl border-t border-[#DAEDD5] inline-flex flex-col items-start gap-9">
        <div className="self-stretch flex flex-col items-start gap-[19px]">
          <h4 className="self-stretch text-[#1F8505] text-lg font-medium leading-[20.7px]">
            Features:
          </h4>
        </div>
        <div className="self-stretch flex flex-col items-start gap-7">
          {plan.features.map((feature) => (
            <div key={feature} className="self-stretch inline-flex items-center gap-2">
              <CheckCircleIcon sx={{ fontSize: 20, color: "#1F8505" }} />
              <span className="flex-1 text-[#6E726E] text-base font-normal leading-[18.4px]">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PricingSection() {
  return (
    <section id="products" className="w-[1201px] mx-auto py-20">
      <div className="flex flex-col items-center gap-[60px]">
        <h2 className="w-[621px] text-center text-[#155A03] text-[48px] font-bold leading-[56px]">
          Choose The Right Plan For Your Carbon Journey
        </h2>
        <div className="w-full flex items-center gap-5">
          {PLANS.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
