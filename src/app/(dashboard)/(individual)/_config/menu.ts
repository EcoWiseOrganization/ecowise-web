import DashboardIcon from "@mui/icons-material/Dashboard";
import AssessmentIcon from "@mui/icons-material/Assessment";
import InventoryIcon from "@mui/icons-material/Inventory";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import BusinessIcon from "@mui/icons-material/Business";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import type { MenuSection } from "../../_components/Sidebar";

export const USER_MENU_SECTIONS: MenuSection[] = [
  {
    title: "sidebar.menu",
    items: [
      { label: "menu.overview", href: "/dashboard", icon: DashboardIcon },
      { label: "menu.organizations", href: "/dashboard/organization", icon: BusinessIcon },
      { label: "menu.activity", href: "/dashboard/activity", icon: HistoryEduIcon },
      { label: "menu.reports", href: "/dashboard/reports", icon: AssessmentIcon },
      { label: "menu.targets", href: "/dashboard/targets", icon: TrackChangesIcon },
      { label: "menu.recommendations", href: "/dashboard/recommendations", icon: LightbulbIcon },
      { label: "menu.compare", href: "/dashboard/compare", icon: CompareArrowsIcon },
      { label: "menu.assets", href: "/dashboard/assets", icon: InventoryIcon },
    ],
  },
  {
    title: "sidebar.general",
    items: [
      { label: "menu.billing", href: "/dashboard/billing", icon: ReceiptLongIcon },
      { label: "menu.settings", href: "/dashboard/settings", icon: SettingsIcon },
      { label: "menu.help", href: "/dashboard/help", icon: HelpOutlineIcon },
    ],
  },
];
