import Link from "next/link";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="w-full">
      <div className="w-[1400px] h-[680px] mx-auto mt-[60px] relative overflow-hidden rounded-3xl">
        {/* Background Image */}
        <Image
          src="/img/home/bg-part1.jpg"
          alt="Green mountains background"
          fill
          className="object-cover w-full h-full rounded-3xl"
          priority
        />

        {/* Content */}
        <div className="absolute left-[82px] top-[57px] w-[561px] flex flex-col gap-10 z-10">
          <h1 className="w-[560px] text-[#155A03] text-[48px] font-bold leading-[56px]">
            Carbon Footprint Report for Your Business
          </h1>
          <p className="w-[477px] text-[#6E726E] text-base font-normal leading-6">
            Track carbon emissions, manage sustainability goals, and generate
            audit-ready reports. The all-in-one portal designed specifically for
            SMEs to thrive in the green economy
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/register"
              className="px-5 py-2.5 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] overflow-hidden rounded-xl text-white text-base font-medium no-underline hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
            >
              Register Now
            </Link>
            <Link
              href="#contact"
              className="px-5 py-2.5 overflow-hidden rounded-xl border border-[#1F8505] text-[#1F8505] text-base font-medium no-underline hover:bg-[#1F8505] hover:text-white hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
