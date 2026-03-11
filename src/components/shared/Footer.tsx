import Link from "next/link";
import Image from "next/image";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import FacebookIcon from "@mui/icons-material/Facebook";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import InstagramIcon from "@mui/icons-material/Instagram";
import MusicNoteIcon from "@mui/icons-material/MusicNote";

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  "About Us": [
    { label: "Company Overview", href: "#" },
    { label: "Mission & Vision", href: "#" },
    { label: "Sustainability Commitment", href: "#" },
    { label: "Partners", href: "#" },
  ],
  Services: [
    { label: "Carbon Measurement", href: "#" },
    { label: "Emission Analysis", href: "#" },
    { label: "Carbon Reporting", href: "#" },
    { label: "Net Zero Consulting", href: "#" },
  ],
  Products: [
    { label: "Website Platform", href: "#" },
    { label: "Mobile App", href: "#" },
    { label: "Enterprise Dashboard", href: "#" },
    { label: "API Integration", href: "#" },
  ],
};

const SOCIAL_LINKS = [
  { icon: FacebookIcon, href: "#", label: "Facebook" },
  { icon: LinkedInIcon, href: "#", label: "LinkedIn" },
  { icon: InstagramIcon, href: "#", label: "Instagram" },
  { icon: MusicNoteIcon, href: "#", label: "TikTok" },
];

export function Footer() {
  return (
    <footer id="contact" className="w-full bg-white shadow-[0px_-2px_4px_rgba(218,237,213,0.25)] border-t border-[#DAEDD5]">
      <div className="w-full h-px bg-[#DAEDD5]" />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-10 sm:pt-[60px] pb-5">
        {/* Top section */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-10 sm:gap-8">
          {/* Logo & Contact */}
          <div className="w-full sm:w-[220px] lg:w-[260px] flex flex-col gap-8 lg:gap-[68px] shrink-0">
            <Image
              src="/img/logo.png"
              alt="EcoWise Logo"
              width={260}
              height={58}
              className="w-[160px] sm:w-[200px] lg:w-[260px] h-auto"
            />
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <PhoneIcon sx={{ fontSize: 20, color: "#79B669" }} />
                <span className="text-[#79B669] text-sm sm:text-base font-normal">
                  (+84) 000 000 000
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <EmailIcon sx={{ fontSize: 20, color: "#79B669" }} />
                <span className="text-[#79B669] text-sm sm:text-base font-normal break-all">
                  ecowise.official.vn@gmail.com
                </span>
              </div>
            </div>
          </div>

          {/* Link Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-6 lg:gap-[100px] w-full sm:w-auto">
            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title} className="flex flex-col gap-3 sm:gap-4">
                <h4 className="text-[#1F8505] text-sm sm:text-base font-semibold leading-6">
                  {title}
                </h4>
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  {links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-[#79B669] text-sm sm:text-base font-normal leading-6 no-underline hover:text-[#1F8505] transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 sm:mt-[100px] flex flex-col items-center gap-4 sm:gap-5">
          <div className="w-full h-px bg-[#DAEDD5]" />

          {/* Mobile: stacked; Desktop: single row */}
          <div className="w-full flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 sm:gap-4">
            <span className="text-[#79B669] text-xs font-normal leading-5">
              &copy; 2026 EcoWise. All rights reserved.
            </span>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link
                href="#"
                className="text-[#79B669] text-xs font-normal leading-5 no-underline hover:text-[#1F8505] transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="text-[#79B669] text-xs font-normal leading-5 no-underline hover:text-[#1F8505] transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
            <div className="flex items-center gap-4 sm:gap-5">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="text-[#79B669] flex hover:text-[#1F8505] transition-colors"
                >
                  <Icon sx={{ fontSize: 22 }} />
                </Link>
              ))}
            </div>
            <span className="text-[#79B669] text-xs font-normal leading-5 text-center sm:text-left">
              This page uses cookies. See cookies details{" "}
              <Link href="#" className="text-[#79B669] underline">
                here
              </Link>
              .
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
