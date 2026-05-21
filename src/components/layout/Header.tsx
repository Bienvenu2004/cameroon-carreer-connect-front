import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { Logo } from "@/components/common/Logo";
import { NotificationBell } from "@/components/common/NotificationBell";
import { useAuthStore } from "@/stores/auth";
import { AuthApi } from "@/api";
import { initials } from "@/lib/utils";

export function Header() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const nav = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const dashboardPath =
    user?.role === "SYSTEM_ADMIN" ? "/admin"
    : user?.role === "RECRUITER" ? "/recruiter"
    : "/seeker";

  const displayName =
    user?.jobSeekerProfile?.firstName ||
    user?.recruiterProfile?.firstName ||
    user?.email?.split("@")[0];

  /**
   * Proper logout sequence:
   *   1. Hit the backend so it can blacklist the JWT and clear the HttpOnly
   *      session cookies server-side (the only place they CAN be cleared —
   *      the SPA can't touch HttpOnly cookies from JS).
   *   2. Clear local UI state (the `jcc_user` cookie + Zustand store).
   *   3. Bounce to /login regardless of whether the API call succeeded —
   *      a network error here shouldn't trap the user in a half-logged-in
   *      UI.
   */
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await AuthApi.logout();
    } catch {
      /* ignore — proceed with client-side cleanup regardless */
    } finally {
      logout();
      setLoggingOut(false);
      nav("/login", { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 lg:flex">
            <NavLink to="/jobs" className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? "text-primary" : "text-foreground/70 hover:text-foreground"}`}>
              {t("nav.jobs")}
            </NavLink>
            <NavLink to="/companies" className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? "text-primary" : "text-foreground/70 hover:text-foreground"}`}>
              {t("nav.companies")}
            </NavLink>
            <NavLink to="/about" className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? "text-primary" : "text-foreground/70 hover:text-foreground"}`}>
              {t("nav.about")}
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {/* Bell renders nothing when there's no auth user, so it's safe
              to mount unconditionally here. */}
          <NotificationBell />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 pl-2 pr-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials(displayName)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav(dashboardPath)}>
                  <UserIcon className="mr-2 h-4 w-4" /> {t("nav.dashboard")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" asChild>
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Button asChild>
                <Link to="/register">{t("nav.register")}</Link>
              </Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
