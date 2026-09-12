import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Briefcase, Building2, Filter, MapPin, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHero } from "@/components/common/PageHero";
import { Pagination } from "@/components/common/Pagination";
import { Reveal } from "@/components/common/motion";
import { CompaniesApi } from "@/api";
import { storageUrl } from "@/lib/api";
import { featuredJobsQuery, industryCountsQuery } from "@/lib/publicQueries";
import {
  ALL_INDUSTRIES, ALL_REGIONS,
  type Industry, type Region,
} from "@/types/api";

const ALL = "ALL" as const;

/**
 * Public companies directory. Mirrors the backend's CompanyFilterDto so the
 * filter chips translate 1:1 to backend predicates:
 *   - name      (LIKE %name%)
 *   - region    (exact match on Cameroon region enum)
 *   - industry  (exact match on Industry enum)
 *   - status    (locked to APPROVED — admins use a separate page for moderation)
 *
 * Filter UX intentionally mirrors the Jobs page: hero search row, labeled
 * selects with self-describing "All X" placeholders, and removable active-
 * filter chips. Consistency across the catalog pages reduces cognitive
 * load — once a user learns the pattern on /jobs they get it for free on
 * /companies.
 */
export function CompaniesPage() {
  const { t } = useTranslation();

  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState<Region | typeof ALL>(ALL);
  const [industry, setIndustry] = useState<Industry | typeof ALL>(ALL);
  const [page, setPage] = useState(0);

  // Reset to first page whenever a filter changes so we don't end up on a
  // page that no longer exists for the new result set.
  useEffect(() => { setPage(0); }, [keyword, region, industry]);

  const filter = {
    page,
    size: 12,
    sortBy: "createdAt",
    sortOrder: "DESC" as const,
    status: "APPROVED" as const,
    name: keyword || undefined,
    region: region === ALL ? undefined : region,
    industry: industry === ALL ? undefined : industry,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["companies-public", filter],
    queryFn: () => CompaniesApi.list(filter),
  });

  // Banner figures describe the whole directory rather than the current filter.
  // Both queries are shared with the home page, so they are usually cached.
  const industries = useQuery(industryCountsQuery);
  const catalogue = useQuery(featuredJobsQuery);
  const industriesRepresented = industries.data?.filter((row) => row.count > 0).length ?? 0;

  const clearAll = () => {
    setKeyword(""); setRegion(ALL); setIndustry(ALL);
  };

  const activeFilters = useMemo(() => {
    const out: { key: string; label: string; value: string; onRemove: () => void }[] = [];
    if (region !== ALL) out.push({
      key: "region", label: t("jobs.region"), value: t(`regions.${region}`),
      onRemove: () => setRegion(ALL),
    });
    if (industry !== ALL) out.push({
      key: "industry", label: t("jobs.industry"), value: t(`industries.${industry}`),
      onRemove: () => setIndustry(ALL),
    });
    return out;
  }, [region, industry, t]);

  const activeCount = activeFilters.length + (keyword ? 1 : 0);

  return (
    <>
      <PageHero
        eyebrow={t("companies.heroEyebrow")}
        icon={BadgeCheck}
        title={t("companies.title")}
        subtitle={t("companies.subtitle")}
        image="/images/pages/companies-yaounde.jpg"
        imageAlt={t("companies.heroImageAlt")}
        stats={[
          { label: t("companies.statCompanies"), value: data?.totalElements ?? 0 },
          { label: t("companies.statIndustries"), value: industriesRepresented },
          { label: t("companies.statOpenJobs"), value: catalogue.data?.totalElements ?? 0 },
        ]}
      />

      <div className="container py-10">
      <div className="rounded-2xl border border-border/60 bg-card p-5 elev-1">
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
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <LabeledSelect
            label={t("jobs.region")}
            value={region}
            onValueChange={(v) => setRegion(v as Region | typeof ALL)}
            placeholder={t("jobs.allRegions")}
            allLabel={t("jobs.allRegions")}
            options={ALL_REGIONS.map((r) => ({ v: r, l: t(`regions.${r}`) }))}
          />
          <LabeledSelect
            label={t("jobs.industry")}
            value={industry}
            onValueChange={(v) => setIndustry(v as Industry | typeof ALL)}
            placeholder={t("jobs.allIndustries")}
            allLabel={t("jobs.allIndustries")}
            options={ALL_INDUSTRIES.map((i) => ({ v: i, l: t(`industries.${i}`) }))}
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
            picks the scope, then types the search term inside it. */}
        <div className="mt-5 border-t border-border/40 pt-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t("companies.searchPlaceholder")}
              className="h-11 pl-10 text-base"
              aria-label={t("companies.searchPlaceholder")}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                aria-label={t("common.clear")}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 text-sm text-muted-foreground">
        {data ? `${data.totalElements} ${t("nav.companies").toLowerCase()}` : t("common.loading")}
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
        ))}
        {data?.content.map((c, index) => (
          <Reveal key={c.id} delay={Math.min(index, 8) * 45}>
            <Link
              to={`/companies/${c.id}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-5 elev-1 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:elev-2"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150"
              />
              <div className="relative flex items-center gap-3">
                {/* The employer's own logo where there is one: a wall of
                    identical placeholder icons is what made this grid dull. */}
                {c.logo?.id ? (
                  <img
                    src={storageUrl(c.logo.id)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-border/60"
                  />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-display text-base font-semibold group-hover:text-primary">{c.name}</span>
                    {c.status === "APPROVED" && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label={t("companies.heroEyebrow")} />
                    )}
                  </div>
                  {c.industry && <div className="text-xs text-muted-foreground">{t(`industries.${c.industry}`)}</div>}
                </div>
              </div>
              {c.description && (
                <p className="relative mt-3 line-clamp-2 text-sm text-foreground/75">{c.description}</p>
              )}
              <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {c.address?.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{c.address.city}
                  </span>
                )}
                {(c.activeJobs ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    <Briefcase className="h-3 w-3" />
                    {t("companies.hiringNow")} · {c.activeJobs}
                  </span>
                )}
                <span className="ml-auto inline-flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {t("companies.viewProfile")}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
        {data && data.content.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
            {t("common.noResults")}
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
      </div>
    </>
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
