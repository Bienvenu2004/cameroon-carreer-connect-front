import { Bookmark, FileText, LayoutDashboard, Search as SearchIcon, Sparkles, User } from "lucide-react";
import { DashboardShell, type SidebarItem } from "@/components/layout/DashboardShell";

const items: SidebarItem[] = [
  { to: "/seeker", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/seeker/recommendations", labelKey: "nav.recommendations", icon: Sparkles },
  { to: "/seeker/profile", labelKey: "nav.myProfile", icon: User },
  { to: "/seeker/applications", labelKey: "nav.applications", icon: FileText },
  { to: "/seeker/saved-jobs", labelKey: "nav.savedJobs", icon: Bookmark },
  { to: "/seeker/saved-searches", labelKey: "nav.savedSearches", icon: SearchIcon },
];

export function SeekerLayout() {
  return <DashboardShell items={items} titleKey="nav.dashboard" />;
}
