import { BarChart3, Building2, Flag, Users } from "lucide-react";
import { DashboardShell, type SidebarItem } from "@/components/layout/DashboardShell";

const items: SidebarItem[] = [
  { to: "/admin", labelKey: "admin.stats", icon: BarChart3, end: true },
  { to: "/admin/users", labelKey: "admin.users", icon: Users },
  { to: "/admin/companies", labelKey: "admin.companies", icon: Building2 },
  { to: "/admin/reports", labelKey: "nav.reports", icon: Flag },
];

export function AdminLayout() {
  return <DashboardShell items={items} titleKey="admin.title" />;
}
