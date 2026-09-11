import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/common/Logo";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { Briefcase, MapPin, BadgeCheck } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(at_30%_20%,hsl(var(--gold)/0.18),transparent_55%)]" aria-hidden />
        <div className="relative p-10">
          <Logo light />
        </div>
        <div className="relative space-y-6 p-10">
          <h2 className="font-display text-3xl font-bold tracking-tight leading-tight">
            {t("home.heroTitle")}
          </h2>
          <p className="max-w-md text-primary-foreground/80">
            {t("home.heroSubtitle")}
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            <div className="flex items-start gap-2">
              <Briefcase className="h-5 w-5 text-gold" />
              <span className="text-xs">{t("home.stats.jobs")}</span>
            </div>
            <div className="flex items-start gap-2">
              <BadgeCheck className="h-5 w-5 text-gold" />
              <span className="text-xs">{t("home.stats.companies")}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-gold" />
              <span className="text-xs">{t("home.stats.regions")}</span>
            </div>
          </div>
        </div>
        <div className="relative p-10 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} {t("brand.name")}
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Logo />
          <LanguageToggle />
        </div>
        <div className="hidden items-center justify-end p-6 lg:flex">
          <LanguageToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <div className="p-6 text-center text-xs text-muted-foreground lg:hidden">
          <Link to="/" className="hover:text-foreground">{t("nav.home")}</Link>
        </div>
      </main>
    </div>
  );
}
