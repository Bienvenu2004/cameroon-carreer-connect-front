import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Check } from "lucide-react";

import { industryCountsQuery } from "./homeQueries";
import { CountUp, Reveal } from "./motion";

/**
 * The closing band: the case for employers, with the job seeker's sign-up
 * beside it so neither audience leaves the page without a next step.
 *
 * Text colours are set explicitly rather than through the foreground tokens,
 * because this band is dark in both themes.
 */
export function EmployerBand() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const industries = useQuery(industryCountsQuery);
  const verifiedEmployers = industries.data?.reduce((sum, row) => sum + row.count, 0) ?? 0;

  const rawPoints: unknown = t("home.employers.points", { returnObjects: true });
  const points = Array.isArray(rawPoints) ? (rawPoints as string[]) : [];

  return (
    <section className="relative overflow-hidden bg-primary-900 py-20 dark:bg-primary-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-500/30 blur-3xl motion-safe:animate-blob"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-gold/10 blur-3xl"
      />

      <div className="container relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        <Reveal className="mx-auto w-full max-w-md">
          <div className="relative">
            <div aria-hidden="true" className="absolute -inset-3 rotate-[-4deg] rounded-[2rem] border-2 border-gold/60" />
            <img
              src="/images/home/employer-portrait.jpg"
              alt={t("home.employers.imageAlt")}
              width={720}
              height={720}
              loading="lazy"
              decoding="async"
              className="relative aspect-square w-full rounded-[2rem] object-cover shadow-2xl"
            />
            <div className="absolute -bottom-6 -right-3 sm:-right-8 motion-safe:animate-float">
              <div className="rounded-2xl bg-card p-4 shadow-xl">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t("home.stats.companies")}
                </div>
                <CountUp
                  value={verifiedEmployers}
                  locale={locale}
                  className="mt-1 block font-display text-3xl font-extrabold text-primary"
                />
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold">
            {t("home.employers.eyebrow")}
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t("home.employers.title")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/75">{t("home.employers.body")}</p>

          <ul className="mt-6 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-white/90">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register?role=RECRUITER"
              className="group inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-gold-foreground shadow-lg transition hover:-translate-y-0.5 hover:brightness-105"
            >
              {t("home.employers.cta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              to="/register?role=JOB_SEEKER"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t("home.employers.ctaSeeker")}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
