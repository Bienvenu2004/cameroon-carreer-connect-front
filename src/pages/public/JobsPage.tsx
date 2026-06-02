import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Filter, Search, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { JobCard } from "@/components/common/JobCard";
import { Pagination } from "@/components/common/Pagination";
import { AiSearchPanel } from "@/components/jobs/AiSearchPanel";
import { JobsApi } from "@/api";
import {
  ALL_INDUSTRIES, ALL_JOB_LANGUAGES, ALL_JOB_SITES, ALL_JOB_TYPES, ALL_REGIONS,
  type Industry, type JobLanguage, type JobSite, type JobType, type Region,
} from "@/types/api";

/**
 * Public jobs catalog with search + filters.
 *
 * Filter UX rules:
 *   - Every select has a VISIBLE label above it. Never make the user
 *     guess what a dropdown controls.
 *   - The "no filter" option is labelled specifically ("All regions",
 *     not just "All") so the selected state is self-describing.
 *   - Active filters surface as removable chips beneath the form, with
 *     a counter badge next to the "Filters" header. Clear-all is
 *     disabled when nothing is active — no orphan affordances.
 *   - The keyword search is the hero: dedicated full-width row at the
 *     top, distinct from the filter row. Filters refine; search finds.
 *
 * State sync:
 *   - URL params are the source of truth and update via `setParams`
 *     in the submit handler and whenever a select changes (replace,
 *     not push, so back-button history isn't spammed).
 *   - React Query re-fetches automatically when the filter object
 *     reference changes (since it's the queryKey).
 */

const ALL = "ALL" as const;

export function JobsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();

  // Search mode. URL-persisted so deep-links + back-button work.
  // Default is "classic" — AI search is opt-in to keep the keyword/filter
  // muscle memory intact for power users.
  const mode: "classic" | "ai" = params.get("mode") === "ai" ? "ai" : "classic";
  const setMode = (next: "classic" | "ai") => {
    const p = new URLSearchParams(params);
    if (next === "ai") p.set("mode", "ai");
    else p.delete("mode");
    setParams(p, { replace: true });
  };

  const [keyword, setKeyword] = useState(params.get("q") ?? "");
  const [region, setRegion] = useState<Region | typeof ALL>((params.get("region") as Region) || ALL);
  const [industry, setIndustry] = useState<Industry | typeof ALL>((params.get("industry") as Industry) || ALL);
  const [jobType, setJobType] = useState<JobType | typeof ALL>((params.get("type") as JobType) || ALL);
  const [site, setSite] = useState<JobSite | typeof ALL>((params.get("site") as JobSite) || ALL);
  const [language, setLanguage] = useState<JobLanguage | typeof ALL>(
    (params.get("lang") as JobLanguage) || ALL,
  );
  const [page, setPage] = useState(0);

  const filter = {
    page,
    size: 12,
    sortBy: "createdAt",
    sortOrder: "DESC" as const,
    isActive: true,
    jobTitle: keyword || undefined,
    region: region === ALL ? undefined : region,
    industry: industry === ALL ? undefined : industry,
    jobType: jobType === ALL ? undefined : jobType,
    jobSite: site === ALL ? undefined : site,
    requiredLanguage: language === ALL ? undefined : language,
  };

  useEffect(() => { setPage(0); }, [keyword, region, industry, jobType, site, language]);

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", filter],
    queryFn: () => JobsApi.list(filter),
  });

  /* ---------- URL sync helpers ---------- */
  const writeUrl = (next: {
    keyword?: string;
    region?: Region | typeof ALL;
    industry?: Industry | typeof ALL;
    jobType?: JobType | typeof ALL;
    site?: JobSite | typeof ALL;
    language?: JobLanguage | typeof ALL;
  }) => {
    const p = new URLSearchParams();
    const k = next.keyword ?? keyword;
    const r = next.region ?? region;
    const i = next.industry ?? industry;
    const jt = next.jobType ?? jobType;
    const s = next.site ?? site;
    const l = next.language ?? language;
    if (k) p.set("q", k);
    if (r !== ALL) p.set("region", r);
    if (i !== ALL) p.set("industry", i);
    if (jt !== ALL) p.set("type", jt);
    if (s !== ALL) p.set("site", s);
    if (l !== ALL) p.set("lang", l);
    setParams(p, { replace: true });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    writeUrl({});
  };

  const clearAll = () => {
    setKeyword("");
    setRegion(ALL); setIndustry(ALL); setJobType(ALL); setSite(ALL); setLanguage(ALL);
    setParams({}, { replace: true });
  };

  /* ---------- Active filter chips ---------- */
  const activeFilters = useMemo(() => {
    const out: { key: string; label: string; value: string; onRemove: () => void }[] = [];
    if (region !== ALL) out.push({
      key: "region", label: t("jobs.region"), value: t(`regions.${region}`),
      onRemove: () => { setRegion(ALL); writeUrl({ region: ALL }); },
    });
    if (industry !== ALL) out.push({
      key: "industry", label: t("jobs.industry"), value: t(`industries.${industry}`),
      onRemove: () => { setIndustry(ALL); writeUrl({ industry: ALL }); },
    });
    if (jobType !== ALL) out.push({
      key: "jobType", label: t("jobs.jobType"), value: t(`jobTypes.${jobType}`),
      onRemove: () => { setJobType(ALL); writeUrl({ jobType: ALL }); },
    });
    if (site !== ALL) out.push({
      key: "site", label: t("jobs.jobSite"), value: t(`jobSites.${site}`),
      onRemove: () => { setSite(ALL); writeUrl({ site: ALL }); },
    });
    if (language !== ALL) out.push({
      key: "language", label: t("jobs.language"), value: t(`jobs.languages.${language}`),
      onRemove: () => { setLanguage(ALL); writeUrl({ language: ALL }); },
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, industry, jobType, site, language, t]);

  const activeCount = activeFilters.length + (keyword ? 1 : 0);

  return (
    <div className="container py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("jobs.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("jobs.subtitle")}</p>
        </div>
        <ModeToggle mode={mode} setMode={setMode} />
      </header>

      {mode === "ai" && (
        <div className="mt-6">
          <AiSearchPanel initialQuery={keyword} onQueryChange={setKeyword} />
        </div>
      )}

      {mode === "classic" && <>
      <form
        onSubmit={submitSearch}
        className="mt-6 rounded-2xl border border-border/60 bg-card p-5 elev-1"
      >
        {/* Filters first — they set the scope. Search refines within. */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{t("jobs.filters")}</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {t("jobs.activeFiltersCount", { count: activeCount })}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={activeCount === 0}
            className="ml-auto h-8 px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            {t("jobs.clearFilters")}
          </Button>
        </div>

        {/* Labeled filter grid */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <LabeledSelect
            label={t("jobs.region")}
            value={region}
            onValueChange={(v) => {
              const next = v as Region | typeof ALL;
              setRegion(next); writeUrl({ region: next });
            }}
            placeholder={t("jobs.allRegions")}
            allLabel={t("jobs.allRegions")}
            options={ALL_REGIONS.map((r) => ({ v: r, l: t(`regions.${r}`) }))}
          />
          <LabeledSelect
            label={t("jobs.industry")}
            value={industry}
            onValueChange={(v) => {
              const next = v as Industry | typeof ALL;
              setIndustry(next); writeUrl({ industry: next });
            }}
            placeholder={t("jobs.allIndustries")}
            allLabel={t("jobs.allIndustries")}
            options={ALL_INDUSTRIES.map((i) => ({ v: i, l: t(`industries.${i}`) }))}
          />
          <LabeledSelect
            label={t("jobs.jobType")}
            value={jobType}
            onValueChange={(v) => {
              const next = v as JobType | typeof ALL;
              setJobType(next); writeUrl({ jobType: next });
            }}
            placeholder={t("jobs.allJobTypes")}
            allLabel={t("jobs.allJobTypes")}
            options={ALL_JOB_TYPES.map((s) => ({ v: s, l: t(`jobTypes.${s}`) }))}
          />
          <LabeledSelect
            label={t("jobs.jobSite")}
            value={site}
            onValueChange={(v) => {
              const next = v as JobSite | typeof ALL;
              setSite(next); writeUrl({ site: next });
            }}
            placeholder={t("jobs.allJobSites")}
            allLabel={t("jobs.allJobSites")}
            options={ALL_JOB_SITES.map((s) => ({ v: s, l: t(`jobSites.${s}`) }))}
          />
          <LabeledSelect
            label={t("jobs.language")}
            value={language}
            onValueChange={(v) => {
              const next = v as JobLanguage | typeof ALL;
              setLanguage(next); writeUrl({ language: next });
            }}
            placeholder={t("jobs.allLanguages")}
            allLabel={t("jobs.allLanguages")}
            options={ALL_JOB_LANGUAGES.map((lng) => ({
              v: lng, l: t(`jobs.languages.${lng}`),
            }))}
          />
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {t("jobs.activeFilters")}:
            </span>
            {activeFilters.map((f) => (
              <FilterChip
                key={f.key}
                label={f.label}
                value={f.value}
                onRemove={f.onRemove}
                removeAria={t("jobs.removeFilter")}
              />
            ))}
          </div>
        )}

        {/* Hero search row — kept BELOW the filters so the user first
            picks the scope, then types the search term inside it.    */}
        <div className="mt-5 border-t border-border/40 pt-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t("jobs.searchPlaceholder")}
                className="h-11 pl-10 text-base"
                aria-label={t("jobs.searchPlaceholder")}
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => { setKeyword(""); writeUrl({ keyword: "" }); }}
                  aria-label={t("common.clear") || "Clear"}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" size="lg" className="h-11 gap-2 sm:px-6">
              <Search className="h-4 w-4" />
              {t("common.search")}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-6 text-sm text-muted-foreground">
        {data ? `${data.totalElements} ${t("nav.jobs").toLowerCase()}` : t("common.loading")}
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
        ))}
        {data?.content.map((j) => <JobCard key={j.id} job={j} />)}
        {data?.content.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
            {t("jobs.noJobsFound")}
          </div>
        )}
      </div>

      {data && (
        <Pagination
          page={data.pageNumber}
          totalPages={data.totalPages}
          isLast={data.isLast}
          totalElements={data.totalElements}
          onChange={setPage}
        />
      )}
      </>}
    </div>
  );
}

/* Mode toggle for classic vs. AI semantic search. */
function ModeToggle({
  mode, setMode,
}: {
  mode: "classic" | "ai";
  setMode: (m: "classic" | "ai") => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="inline-flex shrink-0 items-center rounded-full border border-border bg-card p-0.5 text-xs font-medium">
      <button
        type="button"
        onClick={() => setMode("classic")}
        aria-pressed={mode === "classic"}
        className={
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition " +
          (mode === "classic"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground")
        }
      >
        <Filter className="h-3.5 w-3.5" />
        {t("aiSearch.modeClassic")}
      </button>
      <button
        type="button"
        onClick={() => setMode("ai")}
        aria-pressed={mode === "ai"}
        className={
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition " +
          (mode === "ai"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground")
        }
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t("aiSearch.modeAi")}
      </button>
    </div>
  );
}

/* -------------------- bits -------------------- */

function LabeledSelect({
  label, value, onValueChange, placeholder, allLabel, options,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  allLabel: string;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterChip({
  label, value, onRemove, removeAria,
}: {
  label: string;
  value: string;
  onRemove: () => void;
  removeAria: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 py-0.5 pl-2.5 pr-1 text-xs font-medium text-primary">
      <span className="text-primary/70">{label}:</span>
      <span>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${removeAria} — ${label}`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-primary/60 transition hover:bg-primary/10 hover:text-primary"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
