import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Search, Trash2, X } from "lucide-react";

import { JobsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/common/Pagination";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";
import { relativeTime } from "@/lib/utils";

type JobStatusFilter = "ALL" | "ACTIVE" | "CLOSED";

export function MyJobs() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const qc = useQueryClient();
  const { toast } = useToast();

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<JobStatusFilter>("ALL");
  const [page, setPage] = useState(0);

  // Reset to first page whenever the filter changes so we don't end up on a
  // page that no longer exists.
  useEffect(() => { setPage(0); }, [keyword, status]);

  const filter = {
    page,
    size: 20,
    sortBy: "createdAt",
    sortOrder: "DESC" as const,
    jobTitle: keyword || undefined,
    isActive: status === "ACTIVE" ? true : status === "CLOSED" ? false : undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["my-recruiter-jobs", filter],
    queryFn: () => JobsApi.myList(filter),
  });

  const close = useMutation({
    mutationFn: (id: string) => JobsApi.close(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["my-recruiter-jobs"] }); toast({ title: t("common.successSaved"), variant: "success" }); },
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => JobsApi.remove(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["my-recruiter-jobs"] }); toast({ title: t("common.successDeleted"), variant: "success" }); },
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("nav.myJobs")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.heroSubtitle")}</p>
        </div>
        <Button asChild><Link to="/recruiter/jobs/new"><Plus className="h-4 w-4" /> {t("jobEditor.createTitle")}</Link></Button>
      </header>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("home.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as JobStatusFilter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("jobs.all")}</SelectItem>
            <SelectItem value="ACTIVE">{t("admin.userActive")}</SelectItem>
            <SelectItem value="CLOSED">{t("admin.userSuspended")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

      <div className="space-y-3">
        {data?.content.map((j) => (
          <div key={j.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4 elev-1">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/jobs/${j.id}`} className="font-display text-base font-semibold hover:text-primary">{j.title}</Link>
                {j.isActive ? <Badge variant="success">{t("admin.userActive")}</Badge> : <Badge variant="secondary">{t("admin.userSuspended")}</Badge>}
                {j.type && <Badge variant="outline">{t(`jobTypes.${j.type}`)}</Badge>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {j.location?.city}{j.location?.region && ` · ${t(`regions.${j.location.region}`)}`}
                · {j.views ?? 0} {t("home.stats.jobs").toLowerCase()}
                · {t("jobs.postedAt")} {relativeTime(j.postedDate ?? j.createdAt, locale)}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/recruiter/jobs/${j.id}/edit`}><Edit className="h-4 w-4" /></Link>
              </Button>
              {j.isActive && (
                <Button variant="ghost" size="sm" loading={close.isPending && close.variables === j.id} onClick={() => close.mutate(j.id)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" loading={remove.isPending && remove.variables === j.id} onClick={() => remove.mutate(j.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {data?.content.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
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
