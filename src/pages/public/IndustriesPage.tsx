import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Layers } from "lucide-react";

import { PageHero } from "@/components/common/PageHero";
import { Reveal } from "@/components/common/motion";
import { INDUSTRY_ICONS } from "@/lib/industryIcons";
import { industryCountsQuery } from "@/lib/publicQueries";
import { ALL_INDUSTRIES } from "@/types/api";

/**
 * Browse employers by industry.
 *
 * A directory rather than a filter: someone who knows they want to work in
 * banking, or in agriculture, has a different starting question from someone
 * typing a job title, and making them find the industry dropdown buried in the
 * company list filters answers it badly.
 *
 * Counts come from one grouped query on the server. Twenty list requests from
 * the browser to discover twenty numbers is exactly the thing this platform
 * cannot afford on a metered connection.
 *
 * Every industry renders, including the empty ones. A category that silently
 * disappears when it has no companies makes the grid look broken rather than
 * honest -- and the count tells the visitor the truth before they click. The
 * ones with employers sort to the front, so the first screen is the part of the
 * directory that can be acted on, and the bar under each count compares an
 * industry against the largest one rather than against nothing.
 */
export function IndustriesPage() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery(industryCountsQuery);

  const counts = new Map(data?.map((row) => [row.industry, row.count]) ?? []);
  const totalCompanies = data?.reduce((sum, row) => sum + row.count, 0) ?? 0;
  const withEmployers = data?.filter((row) => row.count > 0).length ?? 0;
  const busiest = Math.max(1, ...(data?.map((row) => row.count) ?? [1]));

  const ordered = [...ALL_INDUSTRIES].sort(
    (a, b) =>
      (counts.get(b) ?? 0) - (counts.get(a) ?? 0) ||
      t(`industries.${a}`).localeCompare(t(`industries.${b}`)),
  );

  return (
    <>
      <PageHero
        eyebrow={t("industries.heroEyebrow")}
        icon={Layers}
        title={t("industries.title")}
        subtitle={t("industries.subtitle")}
        image="/images/pages/industries-statue.jpg"
        imageAlt={t("industries.heroImageAlt")}
        stats={[
          { label: t("industries.statIndustries"), value: ALL_INDUSTRIES.length },
          { label: t("industries.statCompanies"), value: totalCompanies },
          { label: t("industries.statActive"), value: withEmployers },
        ]}
      />

      <div className="container py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((industry, index) => {
              const Icon = INDUSTRY_ICONS[industry];
              const count = counts.get(industry) ?? 0;
              const share = Math.round((count / busiest) * 100);

              return (
                <Reveal key={industry} delay={Math.min(index, 8) * 45}>
                  <Link
                    to={`/companies?industry=${industry}`}
                    className="group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150"
                    />
                    <span
                      className={
                        "relative grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-colors " +
                        (count > 0
                          ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>

                    <span className="relative min-w-0 flex-1">
                      <span className="block font-display font-semibold text-foreground group-hover:text-primary">
                        {t(`industries.${industry}`)}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {isLoading
                          ? t("common.loading")
                          : count > 0
                            ? t("industries.companyCount", { count })
                            : t("industries.empty")}
                      </span>
                      {count > 0 && (
                        <span
                          aria-hidden="true"
                          className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-muted"
                        >
                          <span
                            className="block h-full rounded-full bg-primary/60 transition-all duration-700"
                            style={{ width: `${share}%` }}
                          />
                        </span>
                      )}
                    </span>

                    <ArrowRight
                      aria-hidden="true"
                      className="relative h-4 w-4 shrink-0 -translate-x-1 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </Link>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={120}>
            <aside className="mt-12 overflow-hidden rounded-3xl border border-border/60 bg-card elev-1">
              <div className="grid items-center gap-6 sm:grid-cols-[1fr_0.8fr]">
                <div className="p-7">
                  <h2 className="font-display text-xl font-bold tracking-tight">
                    {t("industries.ctaTitle")}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("industries.ctaBody")}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to="/companies"
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                    >
                      {t("industries.ctaCompanies")}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link
                      to="/jobs"
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                      {t("industries.ctaJobs")}
                    </Link>
                  </div>
                </div>
                <img
                  src="/images/pages/limbe-centre.jpg"
                  alt={t("industries.ctaImageAlt")}
                  loading="lazy"
                  decoding="async"
                  className="hidden h-full max-h-56 w-full object-cover sm:block"
                />
              </div>
            </aside>
          </Reveal>
        </div>
      </div>
    </>
  );
}
