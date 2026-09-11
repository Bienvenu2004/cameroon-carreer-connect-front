import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { type LucideIcon } from "lucide-react";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
}

export function DashboardShell({ items, titleKey }: { items: SidebarItem[]; titleKey: string }) {
  const { t } = useTranslation();
  const loc = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-8 sm:px-5 lg:grid lg:grid-cols-[200px_1fr] lg:gap-6 lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <h2 className="font-display text-xl font-semibold">{t(titleKey)}</h2>
            <nav className="mt-6 space-y-1">
              {items.map(({ to, labelKey, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary-700"
                        : "text-foreground/70 hover:bg-accent hover:text-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {t(labelKey)}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>
        <div className="lg:hidden mb-6">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {items.map(({ to, labelKey, icon: Icon, end }) => {
              const active = end ? loc.pathname === to : loc.pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                    active ? "border-primary bg-primary/5 text-primary-700" : "border-border text-foreground/70"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(labelKey)}
                </NavLink>
              );
            })}
          </div>
        </div>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
