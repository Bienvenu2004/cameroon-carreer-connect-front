import { Briefcase, Building2, FileSearch, LayoutDashboard, User } from "lucide-react";
import { DashboardShell, type SidebarItem } from "@/components/layout/DashboardShell";

const items: SidebarItem[] = [
  { to: "/recruiter", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/recruiter/profile", labelKey: "nav.myProfile", icon: User },
  { to: "/recruiter/companies", labelKey: "nav.myCompanies", icon: Building2 },
  { to: "/recruiter/jobs", labelKey: "nav.myJobs", icon: Briefcase },
  { to: "/recruiter/applications", labelKey: "applications.received", icon: FileSearch },
];

export function RecruiterLayout() {
  return <DashboardShell items={items} titleKey="nav.dashboard" />;
}
