import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Logo } from "@/components/common/Logo";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/50">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("brand.tagline")}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("nav.jobs")}
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/jobs" className="inline-flex min-h-[44px] items-center text-foreground/80 hover:text-primary sm:min-h-0">{t("nav.jobs")}</Link></li>
              <li><Link to="/companies" className="inline-flex min-h-[44px] items-center text-foreground/80 hover:text-primary sm:min-h-0">{t("nav.companies")}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("nav.register")}
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/register?role=JOB_SEEKER" className="inline-flex min-h-[44px] items-center text-foreground/80 hover:text-primary sm:min-h-0">{t("auth.jobSeeker")}</Link></li>
              <li><Link to="/register?role=RECRUITER" className="inline-flex min-h-[44px] items-center text-foreground/80 hover:text-primary sm:min-h-0">{t("auth.recruiter")}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("nav.about")}
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/about" className="inline-flex min-h-[44px] items-center text-foreground/80 hover:text-primary sm:min-h-0">{t("nav.about")}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} {t("brand.name")}. All rights reserved.</span>
          <span>Made in Cameroon</span>
        </div>
      </div>
    </footer>
  );
}
