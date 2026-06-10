"use client";

import Link from "next/link";
import Image from "next/image";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import FacebookIcon from "@mui/icons-material/Facebook";
import { useTranslation } from "react-i18next";

const FACEBOOK_URL = "https://www.facebook.com/EcoWise.Netzero";
const PHONE_DISPLAY = "036 611 2016";
const PHONE_HREF = "tel:+84366112016";
const EMAIL = "ecowise.official.vn@gmail.com";

const SOCIAL_LINKS = [
  { icon: FacebookIcon, href: FACEBOOK_URL, label: "Facebook" },
  { icon: EmailIcon, href: `mailto:${EMAIL}`, label: "Email" },
];

export function Footer() {
  const { t } = useTranslation();

  // Use stable i18n keys as `titleKey` instead of translated strings as
  // object KEYS. The previous shape (`[t("footer.aboutUs")]: [...]`) made
  // React see a fresh `Record` shape every time the language switched —
  // the link columns remounted, losing focus state and flashing.
  const FOOTER_SECTIONS: { titleKey: string; links: { labelKey: string; href: string }[] }[] = [
    {
      titleKey: "footer.aboutUs",
      links: [
        { labelKey: "footer.companyOverview", href: "/about" },
        { labelKey: "footer.missionVision", href: "/about#mission" },
        { labelKey: "footer.sustainabilityCommitment", href: "/about#vision" },
        { labelKey: "footer.partners", href: "/about" },
      ],
    },
    {
      titleKey: "footer.services",
      links: [
        { labelKey: "footer.carbonMeasurement", href: "/services" },
        { labelKey: "footer.emissionAnalysis", href: "/services" },
        { labelKey: "footer.carbonReporting", href: "/services" },
        { labelKey: "footer.netZeroConsulting", href: "/services" },
      ],
    },
    {
      titleKey: "footer.products",
      links: [
        { labelKey: "footer.websitePlatform", href: "/services" },
        { labelKey: "footer.mobileApp", href: "/services" },
        { labelKey: "footer.enterpriseDashboard", href: "/services" },
        { labelKey: "footer.apiIntegration", href: "/contact" },
      ],
    },
  ];

  return (
    <footer id="contact" className="w-full bg-white shadow-[0px_-2px_4px_rgba(218,237,213,0.25)] border-t border-[#DAEDD5]">
      <div className="w-full h-px bg-[#DAEDD5]" />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-10 sm:pt-[60px] pb-5">
        {/* Top section */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-10 sm:gap-8">
          {/* Logo & Contact */}
          <div className="w-full sm:w-[220px] lg:w-[240px] flex flex-col gap-8 lg:gap-[68px] shrink-0">
            <Image
              src="/img/logo.png"
              alt={t("common.alt.logo")}
              width={260}
              height={58}
              className="w-[160px] sm:w-[200px] lg:w-[240px] h-auto"
            />
            <div className="flex flex-col gap-2.5">
              <Link
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-[#79B669] text-sm sm:text-base font-normal no-underline hover:text-[#1F8505] transition-colors"
              >
                <FacebookIcon sx={{ fontSize: 20 }} />
                <span>EcoWise.Netzero</span>
              </Link>
              <Link
                href={PHONE_HREF}
                className="flex items-center gap-2.5 text-[#79B669] text-sm sm:text-base font-normal no-underline hover:text-[#1F8505] transition-colors"
              >
                <PhoneIcon sx={{ fontSize: 20 }} />
                <span>{PHONE_DISPLAY}</span>
              </Link>
              <Link
                href={`mailto:${EMAIL}`}
                className="flex items-center gap-2.5 text-[#79B669] text-sm sm:text-base font-normal no-underline hover:text-[#1F8505] transition-colors"
              >
                <EmailIcon sx={{ fontSize: 20 }} />
                <span className="break-all">{EMAIL}</span>
              </Link>
            </div>
          </div>

          {/* Link Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 w-full sm:w-auto sm:ml-auto lg:mr-2">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.titleKey} className="flex flex-col gap-3 sm:gap-4">
                <h4 className="text-[#1F8505] text-sm sm:text-base font-semibold leading-6 whitespace-nowrap">
                  {t(section.titleKey)}
                </h4>
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  {section.links.map((link) => (
                    <Link
                      key={link.labelKey}
                      href={link.href}
                      className="text-[#79B669] text-sm sm:text-base font-normal leading-6 no-underline hover:text-[#1F8505] transition-colors text-pretty"
                    >
                      {t(link.labelKey)}
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

          <div className="w-full flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 sm:gap-4">
            <span className="text-[#79B669] text-xs font-normal leading-5">
              {t("footer.copyright")}
            </span>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link
                href="#"
                className="text-[#79B669] text-xs font-normal leading-5 no-underline hover:text-[#1F8505] transition-colors"
              >
                {t("footer.termsOfService")}
              </Link>
              <Link
                href="#"
                className="text-[#79B669] text-xs font-normal leading-5 no-underline hover:text-[#1F8505] transition-colors"
              >
                {t("footer.privacyPolicy")}
              </Link>
            </div>
            <div className="flex items-center gap-4 sm:gap-5">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => {
                const isExternal = href.startsWith("http");
                return (
                  <Link
                    key={label}
                    href={href}
                    aria-label={label}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="text-[#79B669] flex hover:text-[#1F8505] transition-colors"
                  >
                    <Icon sx={{ fontSize: 22 }} />
                  </Link>
                );
              })}
            </div>
            <span className="text-[#79B669] text-xs font-normal leading-5 text-center sm:text-left">
              {t("footer.cookies")}{" "}
              <Link href="#" className="text-[#79B669] underline">
                {t("footer.cookiesLink")}
              </Link>
              .
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
