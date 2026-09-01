import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Briefcase, Users2, BadgeCheck, ArrowRight, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobCard } from "@/components/common/JobCard";
import { JobsApi } from "@/api";
import { ALL_REGIONS, type Region } from "@/types/api";
import { formatNumber } from "@/lib/utils";

export function HomePage() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState<Region | "">("");

  const featured = useQuery({
    queryKey: ["home", "featured"],
    queryFn: () => JobsApi.list({ size: 6, sortBy: "createdAt", sortOrder: "DESC", isActive: true }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (region) params.set("region", region);
    nav(`/jobs?${params.toString()}`);
  };

  const total = featured.data?.totalElements ?? 0;
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";

  return (
    <div>
      {/* HERO */}
      {/*
        Flat ground, deliberately.

        This used to carry a two-stop radial mesh at 90% opacity, which put the
        search form -- the most important element on the page -- on a surface
        that shifted underneath it. The form competed with its own background
        instead of being the thing the eye lands on. A hairline rule does the
        separation that the gradient was being asked to do.
      */}
      <section className="relative border-b border-border/60">
        <div className="container mx-auto max-w-6xl relative py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            {/*
              The brand mark, where a "National platform" pill used to sit.

              The glyph rather than the full lockup: the header renders the
              lockup 80px above this, and repeating it identically would read as
              a mistake rather than as branding. Swap the src to
              /logo/logo-full.png if the wordmark is wanted here instead.

              Decorative, so alt is empty — the header logo already announces the
              brand to a screen reader, and the h1 immediately below carries the
              meaning. Announcing the name a second time is noise.
            */}
            <img
              src="/logo/logo-mark.png"
              alt=""
              aria-hidden="true"
              width={255}
              height={288}
              loading="eager"
              decoding="async"
              className="mx-auto h-16 w-auto dark:brightness-0 dark:invert sm:h-20"
            />
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-display-2">
              {t("home.heroTitle")}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              {t("home.heroSubtitle")}
            </p>

            <form onSubmit={submit} className="mx-auto mt-10 grid max-w-3xl gap-3 rounded-2xl border border-border/60 bg-card p-3 elev-2 sm:grid-cols-[1fr_220px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={t("home.searchPlaceholder")}
                  className="h-12 border-0 pl-9 text-base shadow-none focus-visible:ring-0"
                />
              </div>
              <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                <SelectTrigger className="h-12 border-0 shadow-none focus:ring-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder={t("home.regionPlaceholder")} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {ALL_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>{t(`regions.${r}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" size="lg" className="h-12">
                {t("home.searchCta")}
              </Button>
            </form>

            <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-6 text-center">
              <Stat icon={Briefcase} value={formatNumber(total, locale)} label={t("home.stats.jobs")} />
              <Stat icon={BadgeCheck} value={"50+"} label={t("home.stats.companies")} />
              <Stat icon={MapPin} value={"10"} label={t("home.stats.regions")} />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED JOBS */}
      <section className="container mx-auto max-w-6xl py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">{t("home.featuredJobs")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.heroSubtitle")}</p>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/jobs" className="gap-1">
              {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featured.isLoading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
          ))}
          {featured.data?.content?.slice(0, 6).map((j) => <JobCard key={j.id} job={j} />)}
          {featured.isSuccess && featured.data.content.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
              {t("jobs.noJobsFound")}
            </div>
          )}
        </div>
      </section>

      {/* BROWSE BY REGION */}
      <section className="container mx-auto max-w-6xl py-12">
        <h2 className="font-display text-2xl font-semibold">{t("home.browseByRegion")}</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ALL_REGIONS.map((r) => (
            <Link
              key={r}
              to={`/jobs?region=${r}`}
              className="group rounded-xl border border-border/60 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:elev-2"
            >
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary-700">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground group-hover:text-primary">
                    {t(`regions.${r}`)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA dual */}
      <section className="container mx-auto max-w-6xl py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <CTACard
            icon={Users2}
            title={t("home.joinAsSeeker")}
            subtitle={t("home.joinAsSeekerSub")}
            cta={t("home.createAccount")}
            to="/register?role=JOB_SEEKER"
            tone="primary"
          />
          <CTACard
            icon={Building2}
            title={t("home.joinAsRecruiter")}
            subtitle={t("home.joinAsRecruiterSub")}
            cta={t("home.createAccount")}
            to="/register?role=RECRUITER"
            tone="gold"
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Briefcase; value: string; label: string }) {
  return (
    <div>
      <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 elev-1">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="font-display text-xl font-semibold text-foreground">{value}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function CTACard({
  icon: Icon, title, subtitle, cta, to, tone,
}: {
  icon: typeof Users2;
  title: string;
  subtitle: string;
  cta: string;
  to: string;
  tone: "primary" | "gold";
}) {
  return (
    /*
      Both cards sit on the same neutral surface. Tinting the panels themselves
      made two equally loud options, so a visitor had no signal about which one
      was meant for them; the colour now lives only in the icon and in one
      filled button.

      Seeker is the filled action and recruiter is outlined -- not because the
      recruiter matters less, but because a page has one primary action and the
      public home page is read overwhelmingly by people looking for work.
    */
    <div className="relative rounded-2xl border border-border/60 bg-card p-8 elev-1">
      <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl ${
        tone === "primary" ? "bg-primary/10 text-primary" : "bg-gold/15 text-gold-strong"
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <Button asChild className="mt-5" variant={tone === "gold" ? "outline" : "default"}>
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}
