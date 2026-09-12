import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MapPin, Search } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { storageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ALL_REGIONS, type CompanyDto, type Region } from "@/types/api";

import { featuredJobsQuery, homeEmployersQuery, industryCountsQuery } from "@/lib/publicQueries";
import { CountUp, Reveal } from "@/components/common/motion";

/**
 * Split hero: search on the left, a layered photograph on the right.
 *
 * Every figure shown is live. The open-job count is the total of the featured
 * query, verified employers are the sum of the per-industry counts of approved
 * companies, and the logo strip lists only approved companies, so the "verified
 * employers" wording is true of everything it labels.
 */
export function HeroSection() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState<Region | "">("");

  const jobs = useQuery(featuredJobsQuery);
  const industries = useQuery(industryCountsQuery);
  const employers = useQuery(homeEmployersQuery);

  const openJobs = jobs.data?.totalElements ?? 0;
  const verifiedEmployers = industries.data?.reduce((sum, row) => sum + row.count, 0) ?? 0;
  const logos = (employers.data?.content ?? []).filter(
    (company) => company.status === "APPROVED" && company.logo?.id,
  );

  const rawTerms: unknown = t("home.popularTerms", { returnObjects: true });
  const terms = Array.isArray(rawTerms) ? (rawTerms as string[]) : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (region) params.set("region", region);
    nav(`/jobs?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-primary-50/70">
      {/* Deep brand panel behind the photograph. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] rounded-bl-[12rem] bg-primary-900 dark:bg-primary-50 lg:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary-200/50 blur-3xl motion-safe:animate-blob dark:bg-primary-200/20"
      />

      <div className="container relative mx-auto max-w-6xl py-14 lg:py-20">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {t("home.heroEyebrow")}
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {t("home.heroTitle")}
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                {jobs.isSuccess
                  ? t("home.heroSubtitleCount", {
                      count: openJobs,
                      formatted: new Intl.NumberFormat(locale).format(openJobs),
                    })
                  : t("home.heroSubtitle")}
              </p>
            </Reveal>

            <Reveal delay={240}>
              <form
                role="search"
                onSubmit={submit}
                className="mt-8 flex flex-col gap-2 rounded-3xl border border-border/60 bg-card p-2 shadow-xl shadow-primary/5 sm:flex-row sm:items-center sm:rounded-full"
              >
                <label className="relative flex flex-1 items-center">
                  <span className="sr-only">{t("home.searchPlaceholder")}</span>
                  <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder={t("home.searchPlaceholder")}
                    className="h-12 w-full rounded-full bg-transparent pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </label>
                <span aria-hidden="true" className="hidden h-8 w-px bg-border sm:block" />
                <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                  <SelectTrigger className="h-12 rounded-full border-0 bg-transparent shadow-none focus:ring-0 sm:w-48">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <SelectValue placeholder={t("home.regionPlaceholder")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>{t(`regions.${r}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="submit"
                  aria-label={t("home.searchCta")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-700 hover:shadow-lg hover:shadow-primary/30 active:scale-95 sm:w-12 sm:px-0"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  <span className="sm:hidden">{t("home.searchCta")}</span>
                </button>
              </form>
            </Reveal>

            {terms.length > 0 && (
              <Reveal delay={320}>
                <div className="mt-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                    {t("home.popularSearches")}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {terms.map((term) => (
                      <Link
                        key={term}
                        to={`/jobs?q=${encodeURIComponent(term)}`}
                        className="rounded-full border border-primary/15 bg-card/70 px-3 py-1 text-xs font-medium text-primary-700 transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground dark:text-primary"
                      >
                        {term}
                      </Link>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {logos.length > 0 && (
              <Reveal delay={400}>
                <div className="mt-10">
                  <div className="text-xs font-medium text-muted-foreground">{t("home.trustedBy")}</div>
                  <LogoStrip logos={logos} />
                </div>
              </Reveal>
            )}
          </div>

          <Reveal delay={200}>
            <HeroVisual openJobs={openJobs} verifiedEmployers={verifiedEmployers} locale={locale} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function HeroVisual({
  openJobs,
  verifiedEmployers,
  locale,
}: {
  openJobs: number;
  verifiedEmployers: number;
  locale: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px]">
      {/* Stacked cards behind the photograph. Each sits on its own wrapper so
          the float animation's transform does not cancel the rotation. */}
      <div aria-hidden="true" className="absolute inset-0 motion-safe:animate-float-slow">
        <div className="h-full w-full translate-x-7 translate-y-5 rotate-[8deg] rounded-[2rem] bg-primary-500" />
      </div>
      <div aria-hidden="true" className="absolute inset-0">
        <div className="h-full w-full translate-x-3 translate-y-2 rotate-[4deg] rounded-[2rem] bg-gold" />
      </div>

      <img
        src="/images/home/candidate-at-work.jpg"
        alt={t("home.heroImageAlt")}
        width={414}
        height={626}
        loading="eager"
        decoding="async"
        className="relative aspect-[414/560] w-full rounded-[2rem] object-cover object-top shadow-2xl"
      />

      <div className="absolute -right-3 top-8 sm:-right-12 motion-safe:animate-float">
        <div className="w-48 divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/95 px-4 py-2 shadow-xl backdrop-blur">
          <StatRow value={openJobs} label={t("home.stats.jobs")} locale={locale} />
          <StatRow value={verifiedEmployers} label={t("home.stats.companies")} locale={locale} />
          <StatRow value={10} label={t("home.stats.regions")} locale={locale} />
        </div>
      </div>

      <div className="absolute -left-3 bottom-10 sm:-left-12 motion-safe:animate-float [animation-delay:1.5s]">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/95 px-4 py-3 shadow-xl backdrop-blur">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <BadgeCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">{t("home.verifiedOnly")}</div>
            <div className="text-xs text-muted-foreground">{t("home.verifiedOnlySub")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ value, label, locale }: { value: number; label: string; locale: string }) {
  return (
    <div className="flex items-baseline gap-2 py-2">
      <CountUp value={value} locale={locale} className="font-display text-xl font-extrabold text-foreground" />
      <span className="text-xs leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Employer logos. Scrolls as a continuous marquee once there are enough to
 * fill the strip; with only a few it stays still, because a loop of three
 * logos visibly repeating reads as padding rather than as a list.
 */
function LogoStrip({ logos }: { logos: CompanyDto[] }) {
  const loop = logos.length >= 5;
  const copies = loop ? [0, 1] : [0];

  return (
    <div className="relative mt-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className={cn("flex w-max", loop && "motion-safe:animate-marquee hover:[animation-play-state:paused]")}>
        {copies.map((copy) => (
          <div key={copy} aria-hidden={copy === 1 ? true : undefined} className="flex shrink-0 items-center gap-8 pr-8">
            {logos.map((company) => (
              <Link
                key={`${copy}-${company.id}`}
                to={`/companies/${company.id}`}
                tabIndex={copy === 1 ? -1 : undefined}
                className="flex h-10 items-center gap-2 opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
              >
                <img
                  src={storageUrl(company.logo?.id ?? "")}
                  alt=""
                  loading="lazy"
                  className="h-8 w-8 rounded-md object-contain"
                />
                <span className="whitespace-nowrap text-sm font-semibold text-foreground/80">{company.name}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
