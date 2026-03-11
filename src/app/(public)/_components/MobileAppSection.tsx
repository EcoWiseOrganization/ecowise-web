import Image from "next/image";
import AppleIcon from "@mui/icons-material/Apple";
import ShopIcon from "@mui/icons-material/Shop";

export function MobileAppSection() {
  return (
    <section className="relative w-full bg-[linear-gradient(180deg,#DAEDD5_0%,rgba(255,255,255,0)_100%)] overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-[100px] relative">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 lg:gap-0">
          {/* Text Content */}
          <div className="flex flex-col gap-7 lg:gap-10 w-full lg:max-w-[604px] lg:pt-10 relative z-10">
            <h2 className="text-[#155A03] text-[28px] sm:text-[36px] lg:text-[48px] font-bold leading-tight lg:leading-[56px]">
              Take Control of Your Carbon Footprint
            </h2>
            <p className="text-[#6E726E] text-base sm:text-lg font-normal leading-6 max-w-[484px]">
              An easy-to-use mobile app that helps you measure, track, and
              manage your personal carbon emissions - supporting smarter choices
              and your journey toward Net Zero
            </p>
            <div className="flex items-start gap-4 sm:gap-6">
              <a
                href="#"
                className="flex items-center gap-3 p-3 sm:p-4 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] rounded-2xl text-white no-underline hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
              >
                <AppleIcon sx={{ fontSize: 28 }} />
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-[11px] font-normal">Download on the</span>
                  <span className="text-sm sm:text-base font-semibold">App Store</span>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 p-3 sm:p-4 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] rounded-2xl text-white no-underline hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
              >
                <ShopIcon sx={{ fontSize: 28 }} />
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-[11px] font-normal">Get it on</span>
                  <span className="text-sm sm:text-base font-semibold">Google Play</span>
                </div>
              </a>
            </div>
          </div>

          {/* Phone Mockup — hidden on mobile, visible md+ */}
          <div className="hidden md:flex justify-center lg:absolute lg:right-[40px] lg:top-[20px] lg:[perspective:1200px]">
            <div className="lg:[transform:rotateY(-16deg)_rotateX(2deg)_rotateZ(14deg)] lg:[transform-style:preserve-3d]">
              <div className="relative w-[220px] sm:w-[260px] lg:w-[300px] h-[450px] sm:h-[530px] lg:h-[610px] bg-[#1a1a1a] rounded-[40px] lg:rounded-[48px] p-[10px] lg:p-[12px] shadow-[20px_30px_80px_rgba(0,0,0,0.35),-5px_-5px_20px_rgba(255,255,255,0.05)] border-[3px] border-[#333]">
                <div className="absolute left-0 top-[60px] bottom-[60px] w-[3px] bg-gradient-to-b from-transparent via-[#555] to-transparent rounded-full" />
                <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[90px] lg:w-[100px] h-[28px] lg:h-[30px] bg-[#1a1a1a] rounded-b-[16px] z-20">
                  <div className="absolute right-[18px] top-[9px] w-[9px] h-[9px] rounded-full bg-[#0a0a0a] border border-[#333]" />
                </div>
                <div className="relative w-full h-full rounded-[32px] lg:rounded-[36px] overflow-hidden">
                  <Image
                    src="/img/home/iphone.png"
                    alt="Phone screen"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Image
                      src="/img/logo.png"
                      alt="EcoWise Logo"
                      width={140}
                      height={40}
                      className="brightness-0 invert opacity-90 drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)] lg:w-[160px]"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent z-10 pointer-events-none" />
                </div>
              </div>
              <div className="absolute right-[-4px] top-[130px] w-[4px] h-[65px] bg-[#333] rounded-r-sm shadow-[2px_0_4px_rgba(0,0,0,0.3)]" />
              <div className="absolute left-[-4px] top-[110px] w-[4px] h-[28px] bg-[#333] rounded-l-sm shadow-[-2px_0_4px_rgba(0,0,0,0.3)]" />
              <div className="absolute left-[-4px] top-[150px] w-[4px] h-[55px] bg-[#333] rounded-l-sm shadow-[-2px_0_4px_rgba(0,0,0,0.3)]" />
              <div className="absolute left-[-4px] top-[215px] w-[4px] h-[55px] bg-[#333] rounded-l-sm shadow-[-2px_0_4px_rgba(0,0,0,0.3)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-[#DAEDD5]" />
    </section>
  );
}
