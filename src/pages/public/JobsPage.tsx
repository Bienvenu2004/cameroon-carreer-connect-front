import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Filter, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobCard } from "@/components/common/JobCard";
import { Pagination } from "@/components/common/Pagination";
import { JobsApi } from "@/api";
import {
  ALL_INDUSTRIES, ALL_JOB_LANGUAGES, ALL_JOB_SITES, ALL_JOB_TYPES, ALL_REGIONS,
  type Industry, type JobLanguage, type JobSite, type JobType, type Region,
} from "@/types/api";

const ALL = "ALL" as const;

export function JobsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [keyword, setKeyword] = useState(params.get("q") ?? "");
  const [region, setRegion] = useState<Region | typeof ALL>((params.get("region") as Region) || ALL);
  const [industry, setIndustry] = useState<Industry | typeof ALL>((params.get("industry") as Industry) || ALL);
  const [jobType, setJobType] = useState<JobType | typeof ALL>((params.get("type") as JobType) || ALL);
  const [site, setSite] = useState<JobSite | typeof ALL>((params.get("site") as JobSite) || ALL);
  const [language, setLanguage] = useState<JobLanguage | typeof ALL>(
    (params.get("lang") as JobLanguage) || ALL
  );
  const [page, setPage] = useState(0);

  const filter = {
    page, size: 12,
    sortBy: "createdAt", sortOrder: "DESC" as const,
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

  const clear = () => {
    setKeyword(""); setRegion(ALL); setIndustry(ALL); setJobType(ALL); setSite(ALL); setLanguage(ALL);
    setParams({});
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (keyword) p.set("q", keyword);
    if (region !== ALL) p.set("region", region);
    if (industry !== ALL) p.set("industry", industry);
    if (jobType !== ALL) p.set("type", jobType);
    if (site !== ALL) p.set("site", site);
    if (language !== ALL) p.set("lang", language);
    setParams(p);
  };

  return (
    <div className="container py-10">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("jobs.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("jobs.subtitle")}</p>
      </header>

      <form onSubmit={submitSearch} className="mt-6 rounded-2xl border border-border/60 bg-card p-4 elev-1">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <Filter className="h-4 w-4" /> {t("jobs.filters")}
          <Button type="button" variant="link" className="ml-auto h-auto p-0 text-xs" onClick={clear}>
            {t("jobs.clearFilters")}
          </Button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t("home.searchPlaceholder")}
              className="pl-9"
            />
          </div>
          <FilterSelect value={region} onValueChange={(v) => setRegion(v as Region | typeof ALL)} placeholder={t("jobs.region")}
            options={[{ v: ALL, l: t("jobs.all") }, ...ALL_REGIONS.map((r) => ({ v: r, l: t(`regions.${r}`) }))]} />
          <FilterSelect value={industry} onValueChange={(v) => setIndustry(v as Industry | typeof ALL)} placeholder={t("jobs.industry")}
            options={[{ v: ALL, l: t("jobs.all") }, ...ALL_INDUSTRIES.map((i) => ({ v: i, l: t(`industries.${i}`) }))]} />
          <FilterSelect value={jobType} onValueChange={(v) => setJobType(v as JobType | typeof ALL)} placeholder={t("jobs.jobType")}
            options={[{ v: ALL, l: t("jobs.all") }, ...ALL_JOB_TYPES.map((s) => ({ v: s, l: t(`jobTypes.${s}`) }))]} />
          <FilterSelect value={site} onValueChange={(v) => setSite(v as JobSite | typeof ALL)} placeholder={t("jobs.jobSite")}
            options={[{ v: ALL, l: t("jobs.all") }, ...ALL_JOB_SITES.map((s) => ({ v: s, l: t(`jobSites.${s}`) }))]} />
          <FilterSelect
            value={language}
            onValueChange={(v) => setLanguage(v as JobLanguage | typeof ALL)}
            placeholder={t("jobs.language")}
            options={[
              { v: ALL, l: t("jobs.all") },
              ...ALL_JOB_LANGUAGES.map((lng) => ({ v: lng, l: t(`jobs.languages.${lng}`) })),
            ]}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="submit" size="sm">{t("common.search")}</Button>
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
    </div>
  );
}

function FilterSelect({ value, onValueChange, placeholder, options }: {
  value: string; onValueChange: (v: string) => void; placeholder: string; options: { v: string; l: string }[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
