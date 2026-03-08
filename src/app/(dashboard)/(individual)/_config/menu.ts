import DashboardIcon from "@mui/icons-material/Dashboard";
import AssessmentIcon from "@mui/icons-material/Assessment";
import InventoryIcon from "@mui/icons-material/Inventory";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { MenuSection } from "../../_components/Sidebar";

export const USER_MENU_SECTIONS: MenuSection[] = [
  {
    title: "Menu",
    items: [
      { label: "Overview", href: "/dashboard", icon: DashboardIcon },
      { label: "Reports", href: "/dashboard/reports", icon: AssessmentIcon },
      { label: "Asset Inventory", href: "/dashboard/assets", icon: InventoryIcon },
      { label: "Target Tracking", href: "/dashboard/targets", icon: TrackChangesIcon },
    ],
  },
  {
    title: "General",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
      { label: "Help Desk", href: "/dashboard/help", icon: HelpOutlineIcon },
    ],
  },
];
