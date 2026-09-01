import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, User as UserIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { ThemeToggle } from "@/components/common/ThemeToggle";
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
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-close the mobile menu whenever the route changes. Otherwise a
  // user tapping a nav link sees the page swap underneath the overlay
  // and has to close the menu manually before they can interact.
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Close on Escape + lock body scroll while the sheet is open so the
  // page beneath doesn't drift when the user scrolls inside the menu.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  const dashboardPath =
    user?.role === "SYSTEM_ADMIN" ? "/admin"
    : user?.role === "RECRUITER" ? "/recruiter"
    : "/seeker";

  const displayName =
    user?.jobSeekerProfile?.firstName ||
    user?.recruiterProfile?.firstName ||
    user?.email?.split("@")[0];

  // Human-readable label for the role the user is currently logged in as,
  // shown in the top bar so it's always clear which kind of account is active.
  const roleLabel = user ? t(`roles.${user.role}`) : "";

  // The auth /me response embeds the active role's profile (jobSeekerProfile
  // for JOB_SEEKER, recruiterProfile for RECRUITER). FileDto.url is the
  // publicly-resolvable URL — already prefixed with the storage base. We
  // just hand it to <AvatarImage> and let it fail back to <AvatarFallback>
  // (initials) if the image can't load.
  const photoUrl =
    user?.jobSeekerProfile?.profilePhoto?.url ||
    user?.recruiterProfile?.profilePhoto?.url ||
    undefined;

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
            {/* Concours sit alongside jobs rather than under them: public-sector
                recruitment is a distinct route into work here, not a category of
                the private-sector listings. */}
            <NavLink to="/concours" className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? "text-primary" : "text-foreground/70 hover:text-foreground"}`}>
              {t("nav.concours")}
            </NavLink>
            <NavLink to="/about" className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? "text-primary" : "text-foreground/70 hover:text-foreground"}`}>
              {t("nav.about")}
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
          {/* Bell renders nothing when there's no auth user, so it's safe
              to mount unconditionally here. */}
          <NotificationBell />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 pl-2 pr-3">
                  <Avatar className="h-8 w-8">
                    {photoUrl && <AvatarImage src={photoUrl} alt={displayName} />}
                    <AvatarFallback>{initials(displayName)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden flex-col items-start leading-tight sm:flex">
                    <span className="text-sm font-medium">{displayName}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">{roleLabel}</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-1.5">
                  <span className="truncate">{user.email}</span>
                  <Badge variant="secondary" className="w-fit font-normal">{roleLabel}</Badge>
                </DropdownMenuLabel>
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
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? t("nav.close") : t("nav.openMenu")}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-sheet"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav sheet — backdrop + slide-down panel. Rendered as a
          sibling to the header bar so the sticky-top anchor on the header
          works correctly underneath the overlay. Hidden on lg+ where the
          inline nav already shows every link. */}
      {mobileOpen && (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label={t("nav.close")}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 top-16 z-30 bg-black/40 backdrop-blur-sm"
          />
          <nav
            id="mobile-nav-sheet"
            className="fixed inset-x-0 top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border/60 bg-background shadow-lg"
          >
            <div className="container flex flex-col gap-1 py-4">
              <MobileLink to="/jobs" label={t("nav.jobs")} />
              <MobileLink to="/companies" label={t("nav.companies")} />
              <MobileLink to="/concours" label={t("nav.concours")} />
              <MobileLink to="/about" label={t("nav.about")} />

              {user ? (
                <>
                  <div className="my-2 border-t border-border/50" />
                  <MobileLink to={dashboardPath} label={t("nav.dashboard")} />
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-2 rounded-md px-3 py-3 text-left text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <div className="mt-2 grid gap-2 border-t border-border/50 pt-3 sm:hidden">
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/login">{t("nav.login")}</Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link to="/register">{t("nav.register")}</Link>
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/** Single nav link inside the mobile sheet — chunky tap target. */
function MobileLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "rounded-md px-3 py-3 text-sm font-medium transition " +
        (isActive
          ? "bg-primary/10 text-primary"
          : "text-foreground/80 hover:bg-muted hover:text-foreground")
      }
    >
      {label}
    </NavLink>
  );
}
