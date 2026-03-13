import DashboardIcon from "@mui/icons-material/Dashboard";
import AssessmentIcon from "@mui/icons-material/Assessment";
import InventoryIcon from "@mui/icons-material/Inventory";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import BusinessIcon from "@mui/icons-material/Business";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { MenuSection } from "../../_components/Sidebar";

export const USER_MENU_SECTIONS: MenuSection[] = [
  {
    title: "sidebar.menu",
    items: [
      { label: "menu.overview", href: "/dashboard", icon: DashboardIcon },
      { label: "menu.organizations", href: "/dashboard/organization", icon: BusinessIcon },
      { label: "menu.reports", href: "/dashboard/reports", icon: AssessmentIcon },
      { label: "menu.assets", href: "/dashboard/assets", icon: InventoryIcon },
      { label: "menu.targets", href: "/dashboard/targets", icon: TrackChangesIcon },
    ],
  },
  {
    title: "sidebar.general",
    items: [
      { label: "menu.settings", href: "/dashboard/settings", icon: SettingsIcon },
      { label: "menu.help", href: "/dashboard/help", icon: HelpOutlineIcon },
    ],
  },
];
