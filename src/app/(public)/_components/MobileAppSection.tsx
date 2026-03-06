import Image from "next/image";
import AppleIcon from "@mui/icons-material/Apple";
import ShopIcon from "@mui/icons-material/Shop";

export function MobileAppSection() {
  return (
    <section className="relative w-full bg-[linear-gradient(180deg,#DAEDD5_0%,rgba(255,255,255,0)_100%)] overflow-hidden">
      <div className="max-w-[1200px] mx-auto py-[100px] relative min-h-[600px]">
        <div className="flex items-start">
          {/* Text Content */}
          <div className="flex flex-col gap-10 max-w-[604px] pt-10 relative z-10">
            <h2 className="text-[#155A03] text-[48px] font-bold leading-[56px]">
              Take Control of Your Carbon Footprint
            </h2>
            <p className="w-[484px] text-[#6E726E] text-lg font-normal leading-6">
              An easy-to-use mobile app that helps you measure, track, and
              manage your personal carbon emissions - supporting smarter choices
              and your journey toward Net Zero
            </p>
            <div className="flex items-start gap-6">
              <a
                href="#"
                className="flex items-center gap-3 p-4 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] rounded-2xl text-white no-underline hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
              >
                <AppleIcon sx={{ fontSize: 32 }} />
                <div className="flex flex-col">
                  <span className="text-[11px] font-normal">Download on the</span>
                  <span className="text-base font-semibold">App Store</span>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 p-4 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] rounded-2xl text-white no-underline hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
              >
                <ShopIcon sx={{ fontSize: 32 }} />
                <div className="flex flex-col">
                  <span className="text-[11px] font-normal">Get it on</span>
                  <span className="text-base font-semibold">Google Play</span>
                </div>
              </a>
            </div>
          </div>

          {/* Phone Mockup - 3D perspective */}
          <div className="absolute right-[40px] top-[20px] [perspective:1200px]">
            <div className="[transform:rotateY(-16deg)_rotateX(2deg)_rotateZ(14deg)] [transform-style:preserve-3d]">
              {/* Phone body */}
              <div className="relative w-[300px] h-[610px] bg-[#1a1a1a] rounded-[48px] p-[12px] shadow-[20px_30px_80px_rgba(0,0,0,0.35),-5px_-5px_20px_rgba(255,255,255,0.05)] border-[3px] border-[#333]">
                {/* Bezel highlight - left edge */}
                <div className="absolute left-0 top-[60px] bottom-[60px] w-[3px] bg-gradient-to-b from-transparent via-[#555] to-transparent rounded-full" />
                {/* Notch */}
                <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[100px] h-[30px] bg-[#1a1a1a] rounded-b-[16px] z-20">
                  {/* Camera dot */}
                  <div className="absolute right-[20px] top-[10px] w-[10px] h-[10px] rounded-full bg-[#0a0a0a] border border-[#333]" />
                </div>
                {/* Screen */}
                <div className="relative w-full h-full rounded-[36px] overflow-hidden">
                  <Image
                    src="/img/home/iphone.png"
                    alt="Phone screen"
                    fill
                    className="object-cover"
                  />
                  {/* EcoWise logo on screen */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Image
                      src="/img/logo.png"
                      alt="EcoWise Logo"
                      width={160}
                      height={45}
                      className="brightness-0 invert opacity-90 drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]"
                    />
                  </div>
                  {/* Screen reflection */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent z-10 pointer-events-none" />
                </div>
              </div>
              {/* Side button (power) */}
              <div className="absolute right-[-4px] top-[130px] w-[4px] h-[65px] bg-[#333] rounded-r-sm shadow-[2px_0_4px_rgba(0,0,0,0.3)]" />
              {/* Side buttons (volume + silent) */}
              <div className="absolute left-[-4px] top-[110px] w-[4px] h-[28px] bg-[#333] rounded-l-sm shadow-[-2px_0_4px_rgba(0,0,0,0.3)]" />
              <div className="absolute left-[-4px] top-[150px] w-[4px] h-[55px] bg-[#333] rounded-l-sm shadow-[-2px_0_4px_rgba(0,0,0,0.3)]" />
              <div className="absolute left-[-4px] top-[215px] w-[4px] h-[55px] bg-[#333] rounded-l-sm shadow-[-2px_0_4px_rgba(0,0,0,0.3)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom separator - thin line like in the design */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[#DAEDD5]" />
    </section>
  );
}
