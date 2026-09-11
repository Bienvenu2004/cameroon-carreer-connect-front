import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Briefcase, Clock, MapPin } from "lucide-react";

import { storageUrl } from "@/lib/api";
import { INDUSTRY_ICONS } from "@/lib/industryIcons";
import { relativeTime } from "@/lib/utils";
import type { JobDto } from "@/types/api";

import { featuredJobsQuery } from "./homeQueries";
import { Reveal } from "./motion";

/** The latest offers as compact cards on a warm band. */
export function FeaturedJobsSection() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const jobs = useQuery(featuredJobsQuery);
  const list = jobs.data?.content ?? [];

  return (
    <section className="bg-gold/[0.08] py-20 dark:bg-card/40">
      <div className="container mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("home.featuredJobs")}
              </h2>
              <p className="mt-2 text-muted-foreground">{t("home.featuredSubtitle")}</p>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {jobs.isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-border/60 bg-card" />
            ))}

          {list.slice(0, 8).map((job, i) => (
            <Reveal key={job.id} delay={i * 60} className="h-full">
              <FeaturedJobCard job={job} locale={locale} />
            </Reveal>
          ))}

          {jobs.isSuccess && list.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-muted-foreground">
              {t("jobs.noJobsFound")}
            </div>
          )}
        </div>

        <Reveal className="mt-12 flex justify-center">
          <Link
            to="/jobs"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-xl"
          >
            {t("home.allJobOffers")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function FeaturedJobCard({ job, locale }: { job: JobDto; locale: string }) {
  const { t } = useTranslation();
  const company = job.company;
  const industry = company?.industry;
  const Icon = industry ? INDUSTRY_ICONS[industry] : Briefcase;
  const place = job.location?.city ?? (job.location?.region ? t(`regions.${job.location.region}`) : null);

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="truncate">{industry ? t(`industries.${industry}`) : t("home.anyIndustry")}</span>
      </div>

      <h3 className="mt-4 line-clamp-2 font-display text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
        {job.title}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {place && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {place}
          </span>
        )}
        {job.type && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {t(`jobTypes.${job.type}`)}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-6">
        <div className="min-w-0 text-xs">
          <div className="text-muted-foreground">{relativeTime(job.postedDate ?? job.createdAt, locale)}</div>
          <div className="mt-0.5 flex items-center gap-1 font-semibold text-foreground">
            <span className="truncate">{company?.name ?? "—"}</span>
            {company?.status === "APPROVED" && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            )}
          </div>
        </div>
        <CompanyTile name={company?.name} logoId={company?.logo?.id} />
      </div>
    </Link>
  );
}

const TILE_TONES = [
  "bg-primary text-primary-foreground",
  "bg-gold text-gold-foreground",
  "bg-primary-700 text-white",
  "bg-foreground text-background",
];

/** The company logo, or a coloured initial chosen stably from the name. */
function CompanyTile({ name, logoId }: { name?: string; logoId?: string }) {
  const tile =
    "grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110";

  if (logoId) {
    return (
      <span className={`${tile} overflow-hidden bg-white p-1 ring-1 ring-border`}>
        <img src={storageUrl(logoId)} alt="" loading="lazy" className="h-full w-full object-contain" />
      </span>
    );
  }

  const label = (name ?? "?").trim();
  const hash = Array.from(label).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (
    <span aria-hidden="true" className={`${tile} font-display text-lg font-bold ${TILE_TONES[hash % TILE_TONES.length]}`}>
      {label.charAt(0).toUpperCase()}
    </span>
  );
}
