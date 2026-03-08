import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import type { MenuSection } from "../../_components/Sidebar";

export const ADMIN_MENU_SECTIONS: MenuSection[] = [
  {
    title: "Management",
    items: [
      { label: "Dashboard", href: "/admin", icon: AdminPanelSettingsIcon },
      { label: "User Management", href: "/admin/users", icon: PeopleIcon },
    ],
  },
  {
    title: "General",
    items: [
      { label: "Settings", href: "/admin/settings", icon: SettingsIcon },
    ],
  },
];
