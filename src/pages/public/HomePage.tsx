import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

import { ActivityFeed } from "@/components/common/ActivityFeed";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { EmployerBand } from "@/components/home/EmployerBand";
import { FeaturedJobsSection } from "@/components/home/FeaturedJobsSection";
import { HeroSection } from "@/components/home/HeroSection";
import { Reveal } from "@/components/home/motion";
import { ALL_REGIONS } from "@/types/api";

/**
 * Public home page.
 *
 * Read top to bottom, it answers a first-time visitor's questions in the order
 * they ask them: can I search here (hero), what kinds of work are there
 * (categories), what is open right now (featured offers), is anyone actually
 * using this (live activity) and where (regions), and finally, for employers,
 * why post here at all.
 *
 * Every figure on the page comes from the API. Motion is decorative and
 * switches off entirely for visitors who ask their system for reduced motion.
 */
export function HomePage() {
  const { t } = useTranslation();

  return (
    <div>
      <HeroSection />
      <CategoriesSection />
      <FeaturedJobsSection />

      <section className="container mx-auto max-w-6xl py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <div className="h-full rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">{t("home.live")}</span>
              </div>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">{t("feed.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("feed.subtitle")}</p>
              <ActivityFeed scope="platform" limit={6} className="mt-6" />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <h2 className="font-display text-2xl font-bold tracking-tight">{t("home.browseByRegion")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.regionsSubtitle")}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {ALL_REGIONS.map((region) => (
                <Link
                  key={region}
                  to={`/jobs?region=${region}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 transition duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:shadow-lg hover:shadow-primary/20"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-white/15 group-hover:text-primary-foreground">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="truncate text-sm font-medium text-foreground transition group-hover:text-primary-foreground">
                    {t(`regions.${region}`)}
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <EmployerBand />
    </div>
  );
}
