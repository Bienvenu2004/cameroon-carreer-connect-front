import { useTranslation } from "react-i18next";
import { BadgeCheck, Building2, Globe2, Users } from "lucide-react";

export function AboutPage() {
  const { t } = useTranslation();
  return (
    <div className="container py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">{t("brand.name")}</h1>
      <p className="mt-2 text-lg text-muted-foreground">{t("brand.tagline")}</p>
      <p className="mt-6 text-foreground/85 leading-relaxed">{t("home.heroSubtitle")}</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {[
          { icon: Globe2, title: t("home.browseByRegion"), text: t("home.heroSubtitle") },
          { icon: BadgeCheck, title: t("admin.approvedCompanies"), text: t("home.joinAsRecruiterSub") },
          { icon: Users, title: t("home.joinAsSeeker"), text: t("home.joinAsSeekerSub") },
          { icon: Building2, title: t("home.joinAsRecruiter"), text: t("home.joinAsRecruiterSub") },
        ].map((b, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card p-5 elev-1">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <b.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold">{b.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
