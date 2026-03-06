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
    <footer className="w-full bg-white shadow-[0px_-2px_4px_rgba(218,237,213,0.25)] border-t border-[#DAEDD5]">
      {/* Top separator line */}
      <div className="w-full h-px bg-[#DAEDD5]" />
      <div className="max-w-[1200px] mx-auto pt-[60px] pb-5">
        {/* Top section */}
        <div className="flex items-start justify-between">
          {/* Logo & Contact */}
          <div className="w-[260px] flex flex-col gap-[68px] shrink-0">
            <Image
              src="/img/logo.png"
              alt="EcoWise Logo"
              width={260}
              height={58}
              className="w-full h-auto"
            />
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <PhoneIcon sx={{ fontSize: 20, color: "#79B669" }} />
                <span className="text-[#79B669] text-base font-normal">
                  (+84) 000 000 000
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <EmailIcon sx={{ fontSize: 20, color: "#79B669" }} />
                <span className="text-[#79B669] text-base font-normal">
                  ecowise.official.vn@gmail.com
                </span>
              </div>
            </div>
          </div>

          {/* Link Columns */}
          <div className="flex items-start gap-[100px]">
            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div
                key={title}
                className={`${title === "About Us" ? "w-[203px]" : "w-[180px]"} flex flex-col gap-4`}
              >
                <h4 className="text-[#1F8505] text-base font-semibold leading-6">
                  {title}
                </h4>
                <div className="flex flex-col gap-2">
                  {links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-[#79B669] text-base font-normal leading-6 no-underline hover:text-[#1F8505] transition-colors"
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
        <div className="mt-[100px] flex flex-col items-center gap-5">
          <div className="w-full h-px bg-[#DAEDD5]" />
          <div className="w-full flex items-center justify-between">
            <span className="text-[#79B669] text-xs font-normal leading-5">
              &copy; 2026 EcoWise. All rights reserved.
            </span>
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
            <div className="flex items-center gap-5">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="text-[#79B669] flex hover:text-[#1F8505] transition-colors"
                >
                  <Icon sx={{ fontSize: 24 }} />
                </Link>
              ))}
            </div>
            <span className="text-[#79B669] text-xs font-normal leading-5">
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
