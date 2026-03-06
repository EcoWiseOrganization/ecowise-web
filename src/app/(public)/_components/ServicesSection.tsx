import Image from "next/image";
import Link from "next/link";
import DescriptionIcon from "@mui/icons-material/Description";

const SERVICES_TOP = [
  {
    title: "Emission Management by Scope",
    description:
      "Calculate emissions by Scope 1, 2, 3. Compliant with the GHG Protocol and ISO 14064.",
  },
];

const SERVICES_GRID = [
  {
    title: "Net Zero 2050 Roadmap",
    description:
      "Build a tailored reduction strategy. Align with international commitments.",
  },
  {
    title: "Analytics & Optimization",
    description:
      "Visual dashboards and in-depth analysis. Identify reduction opportunities.",
  },
  {
    title: "Carbon Reporting",
    description:
      "Generate ESG reports. Export data compliant with Vietnamese and global standards.",
  },
  {
    title: "Verification & Compliance",
    description:
      "Data is verified and compliant with Vietnamese regulations and international standards (GRI, TCFD, CDP).",
  },
];

function ServiceCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-5 px-5 py-6 bg-white/95 shadow-[0px_4px_4px_rgba(218,237,213,0.25)] rounded-xl border border-[#DAEDD5]">
      <div className="shrink-0 w-10 h-10 bg-[#79B669] rounded-full flex items-center justify-center">
        <DescriptionIcon sx={{ fontSize: 20, color: "white" }} />
      </div>
      <div className="flex flex-col gap-2.5 flex-1 min-w-0">
        <h3 className="text-[#104502] text-xl font-semibold leading-6">
          {title}
        </h3>
        <p className="text-[#6E726E] text-base font-normal leading-6">
          {description}
        </p>
      </div>
    </div>
  );
}

export function ServicesSection() {
  return (
    <section id="services" className="relative overflow-hidden bg-[#1F3818]">
      {/* Background image overlay */}
      <Image
        src="/img/home/bg-part2.jpg"
        alt=""
        fill
        className="object-cover opacity-15"
        aria-hidden="true"
      />

      <div className="relative max-w-[1200px] mx-auto px-5 py-[100px]">
        <div className="flex flex-col gap-[60px]">
          {/* Top: Title + Dashboard Image */}
          <div className="flex justify-between items-start gap-[60px]">
            {/* Left content */}
            <div className="w-[529px] flex flex-col gap-10 shrink-0">
              <div className="flex flex-col gap-2.5">
                <h2 className="text-white text-[48px] font-bold leading-[56px]">
                  Comprehensive solutions for carbon footprint management
                </h2>
                <p className="text-[#E5E5E5] text-lg font-normal leading-6">
                  EcoWise provides a full suite of tools to help businesses
                  measure, analyze, and reduce carbon emissions efficiently
                </p>
              </div>
              <Link
                href="#services"
                className="self-start px-5 py-2.5 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] overflow-hidden rounded-xl text-white text-xl font-medium no-underline hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
              >
                Explore our services
              </Link>
            </div>

            {/* Dashboard Image */}
            <div className="relative mt-6">
              <Image
                src="/img/home/dashboard.png"
                alt="EcoWise Dashboard"
                width={474}
                height={351}
                className="rotate-[5deg] origin-top-left shadow-[0px_4px_4px_rgba(218,237,213,0.25)] rounded-xl border-4 border-[#DAEDD5]"
              />
            </div>
          </div>

          {/* Service Cards */}
          <div className="flex flex-col gap-4">
            {/* First card half-width aligned left */}
            <div className="w-[calc(50%-8px)]">
              {SERVICES_TOP.map((service) => (
                <ServiceCard key={service.title} {...service} />
              ))}
            </div>

            {/* Grid 2x2 */}
            <div className="grid grid-cols-2 gap-4">
              {SERVICES_GRID.map((service) => (
                <ServiceCard key={service.title} {...service} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
