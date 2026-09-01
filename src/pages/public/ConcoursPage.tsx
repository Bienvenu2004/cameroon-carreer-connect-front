import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Landmark, ScrollText } from "lucide-react";

import { JobsApi } from "@/api";
import { JobCard } from "@/components/common/JobCard";
import { Pagination } from "@/components/common/Pagination";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ALL_REGIONS, type Region } from "@/types/api";

const ALL = "__all__";

/**
 * Concours and public-sector recruitment.
 *
 * Public-sector hiring through competitive examination is a large share of how
 * Cameroonians actually look for work, and it is announced across dozens of
 * separate ministry notices with no central listing — so people hear about a
 * concours through word of mouth, often after the deadline.
 *
 * These are ordinary Job rows carrying a publicSector flag rather than a
 * parallel entity, which is why this page gets search, filtering, saving, alerts
 * and sharing without any of it being written twice. They are curated by an
 * administrator, since a concours carries a ministry's authority and a recruiter
 * must not be able to dress an ordinary advert in it.
 */
export function ConcoursPage() {
  const { t } = useTranslation();
  const [region, setRegion] = useState<Region | typeof ALL>(ALL);
  const [page, setPage] = useState(0);

  const filter = {
    publicSector: true,
    region: region === ALL ? undefined : region,
    page,
    size: 12,
    sortBy: "applicationDeadline",
    sortOrder: "ASC" as const,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["concours", filter],
    queryFn: () => JobsApi.list(filter),
  });

  const jobs = data?.content ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <Landmark className="h-3.5 w-3.5" />
          {t("concours.badge")}
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
          {t("concours.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("concours.subtitle")}</p>
        <p className="mt-3 max-w-2xl rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {t("concours.intro")}
        </p>
      </header>

      <div className="mb-6 max-w-xs space-y-1.5">
        <Label className="text-xs">{t("jobs.region")}</Label>
        <Select
          value={region}
          onValueChange={(v) => { setRegion(v as Region | typeof ALL); setPage(0); }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("jobs.allRegions")}</SelectItem>
            {ALL_REGIONS.map((r) => (
              <SelectItem key={r} value={r}>{t(`regions.${r}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

      {!isLoading && jobs.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/70 px-6 py-12 text-center">
          <ScrollText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium text-foreground">{t("concours.none")}</p>
        </div>
      )}

      {jobs.length > 0 && (
        <>
          <div className="grid gap-4">
            {jobs.map((job) => (
              <div key={job.id}>
                <JobCard job={job} />
                {(job.publicSectorBody || job.publicSectorRef) && (
                  <div className="-mt-1 flex flex-wrap gap-x-5 gap-y-1 rounded-b-xl border border-t-0 border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                    {job.publicSectorBody && (
                      <span><strong className="font-medium text-foreground/80">{t("concours.body")}:</strong> {job.publicSectorBody}</span>
                    )}
                    {job.publicSectorRef && (
                      <span><strong className="font-medium text-foreground/80">{t("concours.reference")}:</strong> {job.publicSectorRef}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 1}
            isLast={data?.isLast ?? true}
            totalElements={data?.totalElements ?? 0}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
