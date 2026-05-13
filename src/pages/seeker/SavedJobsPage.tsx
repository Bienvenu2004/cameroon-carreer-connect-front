import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Briefcase, Building2, ArrowRight, Trash2 } from "lucide-react";

import { SavedJobsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/common/Pagination";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";

/**
 * Backend returns PageResponse<JobSeekerSaveDto> — a minimal projection of
 * { jobId, jobTitle, companyName }. We render a slim card rather than
 * reusing JobCard (which needs the full JobDto shape). Toggling a saved
 * job is a single POST to /api/hjp/saved-jobs/{jobId} (un-save semantics
 * are handled server-side as toggle).
 */
export function SavedJobsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);

  const filter = {
    page,
    size: 12,
    sortBy: "createdAt",
    sortOrder: "DESC" as const,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["saved-jobs", filter],
    queryFn: () => SavedJobsApi.list(filter),
  });

  const unsave = useMutation({
    mutationFn: (jobId: string) => SavedJobsApi.toggle(jobId),
    onSuccess: () => {
      toast({ title: t("common.successDeleted"), variant: "success" });
      void qc.invalidateQueries({ queryKey: ["saved-jobs"] });
      void qc.invalidateQueries({ queryKey: ["my-saved-jobs"] });
    },
    onError: (e) => toast({
      title: t("common.errorOccurred"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("savedJobs.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("savedJobs.subtitle")}</p>
      </header>

      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.content.map((s) => (
          <article
            key={s.jobId}
            className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-5 elev-1 transition-all hover:elev-2"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/jobs/${s.jobId}`}
                  className="block truncate font-display text-base font-semibold hover:text-primary"
                >
                  {s.jobTitle}
                </Link>
                {s.companyName && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {s.companyName}
                  </div>
                )}
              </div>
              <Bookmark className="h-4 w-4 shrink-0 fill-primary text-primary" />
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-2">
              <Button asChild variant="ghost" size="sm">
                <Link to={`/jobs/${s.jobId}`}>
                  {t("common.view")} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                loading={unsave.isPending && unsave.variables === s.jobId}
                onClick={() => unsave.mutate(s.jobId)}
                title={t("common.successDeleted")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>

      {data?.content.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
          {t("savedJobs.empty")}
        </div>
      )}

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
