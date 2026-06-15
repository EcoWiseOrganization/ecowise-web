import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import ScienceIcon from "@mui/icons-material/Science";
import FunctionsIcon from "@mui/icons-material/Functions";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import UpgradeIcon from "@mui/icons-material/Upgrade";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import RedeemIcon from "@mui/icons-material/Redeem";
import InsightsIcon from "@mui/icons-material/Insights";
import HistoryIcon from "@mui/icons-material/History";
import BusinessIcon from "@mui/icons-material/Business";
import MailIcon from "@mui/icons-material/Mail";
import type { MenuSection } from "../../_components/Sidebar";

export const ADMIN_MENU_SECTIONS: MenuSection[] = [
  {
    title: "admin.menu.operations",
    items: [
      { label: "admin.menu.dashboard", href: "/admin", icon: AdminPanelSettingsIcon },
      { label: "admin.menu.systemOverview", href: "/admin/system-overview", icon: InsightsIcon },
      { label: "admin.menu.auditLogs", href: "/admin/audit-logs", icon: HistoryIcon },
      { label: "admin.menu.organizations", href: "/admin/organizations", icon: BusinessIcon },
      { label: "admin.menu.contactMessages", href: "/admin/contact-messages", icon: MailIcon },
    ],
  },
  {
    title: "admin.menu.management",
    items: [
      { label: "admin.menu.userManagement", href: "/admin/users", icon: PeopleIcon },
      { label: "admin.menu.subscriptions", href: "/admin/subscriptions", icon: CardMembershipIcon },
      { label: "admin.menu.upgradeRequests", href: "/admin/subscriptions/upgrade-requests", icon: UpgradeIcon },
    ],
  },
  {
    title: "admin.menu.gamification",
    items: [
      { label: "admin.menu.challenges", href: "/admin/challenges", icon: EmojiEventsIcon },
      { label: "admin.menu.rewards", href: "/admin/rewards", icon: RedeemIcon },
    ],
  },
  {
    title: "admin.menu.emissionEngine",
    items: [
      { label: "admin.menu.emissionFactors", href: "/admin/emission-factors", icon: ScienceIcon },
      { label: "admin.menu.formulaBuilder", href: "/admin/formula-builder", icon: FunctionsIcon },
    ],
  },
  {
    title: "admin.menu.general",
    items: [
      { label: "admin.menu.settings", href: "/admin/settings", icon: SettingsIcon },
    ],
  },
];
