import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import ScienceIcon from "@mui/icons-material/Science";
import FunctionsIcon from "@mui/icons-material/Functions";
import type { MenuSection } from "../../_components/Sidebar";

export const ADMIN_MENU_SECTIONS: MenuSection[] = [
  {
    title: "admin.menu.management",
    items: [
      { label: "admin.menu.dashboard",      href: "/admin",                    icon: AdminPanelSettingsIcon },
      { label: "admin.menu.userManagement", href: "/admin/users",              icon: PeopleIcon },
    ],
  },
  {
    title: "admin.menu.emissionEngine",
    items: [
      { label: "admin.menu.emissionFactors", href: "/admin/emission-factors",  icon: ScienceIcon },
      { label: "admin.menu.formulaBuilder",  href: "/admin/formula-builder",   icon: FunctionsIcon },
    ],
  },
  {
    title: "admin.menu.general",
    items: [
      { label: "admin.menu.settings",        href: "/admin/settings",          icon: SettingsIcon },
    ],
  },
];
