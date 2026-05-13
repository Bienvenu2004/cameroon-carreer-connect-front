import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Filter, MapPin, Briefcase, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/common/Pagination";
import { CompaniesApi } from "@/api";
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
 * Pagination is server-side via PageResponseDto.
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

  const clear = () => {
    setKeyword(""); setRegion(ALL); setIndustry(ALL);
  };

  return (
    <div className="container py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("nav.companies")}</h1>
      <p className="mt-1 text-muted-foreground">{t("home.heroSubtitle")}</p>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-4 elev-1">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <Filter className="h-4 w-4" /> {t("jobs.filters")}
          <Button type="button" variant="link" className="ml-auto h-auto p-0 text-xs" onClick={clear}>
            {t("jobs.clearFilters")}
          </Button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t("common.search")}
              className="pl-9"
            />
          </div>
          <Select value={region} onValueChange={(v) => setRegion(v as Region | typeof ALL)}>
            <SelectTrigger><SelectValue placeholder={t("jobs.region")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("jobs.all")}</SelectItem>
              {ALL_REGIONS.map((r) => (
                <SelectItem key={r} value={r}>{t(`regions.${r}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={industry} onValueChange={(v) => setIndustry(v as Industry | typeof ALL)}>
            <SelectTrigger><SelectValue placeholder={t("jobs.industry")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("jobs.all")}</SelectItem>
              {ALL_INDUSTRIES.map((i) => (
                <SelectItem key={i} value={i}>{t(`industries.${i}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 text-sm text-muted-foreground">
        {data ? `${data.totalElements} ${t("nav.companies").toLowerCase()}` : t("common.loading")}
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
        ))}
        {data?.content.map((c) => (
          <Link key={c.id} to={`/companies/${c.id}`} className="group rounded-xl border border-border/60 bg-card p-5 elev-1 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:elev-2">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-display text-base font-semibold group-hover:text-primary">{c.name}</div>
                {c.industry && <div className="text-xs text-muted-foreground">{t(`industries.${c.industry}`)}</div>}
              </div>
            </div>
            {c.description && (
              <p className="mt-3 line-clamp-2 text-sm text-foreground/75">{c.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {c.address?.city && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.address.city}</span>
              )}
              {(c.activeJobs ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 font-medium text-primary"><Briefcase className="h-3 w-3" />{c.activeJobs} {t("nav.jobs").toLowerCase()}</span>
              )}
            </div>
          </Link>
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
  );
}
