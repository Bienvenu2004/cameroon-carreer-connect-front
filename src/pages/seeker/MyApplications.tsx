import { useState } from "react";
import type { JobApplicationDto } from "@/types/api";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BellRing } from "lucide-react";

import { ApplicationsApi } from "@/api";
import { ApplicationStatusBadge } from "@/components/common/StatusBadge";
import { ApplicationDetailDialog } from "@/components/seeker/ApplicationDetailDialog";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/common/Pagination";
import { relativeTime } from "@/lib/utils";

export function MyApplications() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<JobApplicationDto | null>(null);

  /**
   * Set when the page is opened from a notification about one application (a
   * status change): the list narrows to that application and its history
   * opens, so the candidate lands on what changed rather than on page one of
   * everything. Closing the dialog keeps the narrowed list; "Show all" clears it.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const focusedId = searchParams.get("application");
  const [dismissedFocusId, setDismissedFocusId] = useState<string | null>(null);

  const filter = {
    page: focusedId ? 0 : page,
    size: 20,
    sortBy: "createdAt",
    sortOrder: "DESC" as const,
    ...(focusedId ? { applicationId: focusedId } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["my-applications-full", filter],
    queryFn: () => ApplicationsApi.list(filter),
  });

  const focused =
    focusedId && dismissedFocusId !== focusedId
      ? data?.content.find((a) => a.id === focusedId) ?? null
      : null;

  const showAll = () => {
    setSearchParams({}, { replace: true });
    setPage(0);
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("applications.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("applications.subtitle")}</p>
      </header>

      {focusedId && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-2 text-foreground">
            <BellRing className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("applications.focusedFromNotification")}
          </span>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={showAll}>
            {t("applications.showAll")}
          </Button>
        </div>
      )}

      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

      {data && data.content.length === 0 && (
        focusedId ? (
          // The notified application may since have been removed.
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-muted-foreground">{t("errors.notFound")}</p>
            <Button className="mt-4" onClick={showAll}>{t("applications.showAll")}</Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-muted-foreground">{t("applications.noApplications")}</p>
            <Button asChild className="mt-4"><Link to="/jobs">{t("applications.browseJobs")}</Link></Button>
          </div>
        )
      )}

      {data && data.content.length > 0 && (
        <>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card elev-1">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4 text-left font-medium">{t("nav.jobs")}</th>
                <th className="p-4 text-left font-medium">{t("applications.appliedOn")}</th>
                <th className="p-4 text-left font-medium">{t("applications.status")}</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((a) => (
                <tr
                  key={a.id}
                  className={`border-b border-border/40 last:border-0 hover:bg-accent/30${a.id === focusedId ? " bg-primary/5" : ""}`}
                >
                  <td className="p-4">
                    <div className="font-medium">{a.jobTitle ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{a.companyName}</div>
                  </td>
                  <td className="p-4 text-muted-foreground">{relativeTime(a.applyDate, locale)}</td>
                  <td className="p-4"><ApplicationStatusBadge status={a.status} /></td>
                  <td className="p-4 text-right">
                    {/* The history and the way out both live behind one click,
                        so the table stays a table. */}
                    <Button variant="link" size="sm" onClick={() => setDetail(a)}>
                      {t("applications.timeline")}
                    </Button>
                    {a.jobId && (
                      <Button variant="link" size="sm" asChild>
                        <Link to={`/jobs/${a.jobId}`}>{t("common.view")}</Link>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={data.pageNumber}
          totalPages={data.totalPages}
          isLast={data.isLast}
          totalElements={data.totalElements}
          onChange={setPage}
        />
        </>
      )}

      <ApplicationDetailDialog
        application={detail ?? focused}
        onClose={() => {
          setDetail(null);
          if (focusedId) setDismissedFocusId(focusedId);
        }}
      />
    </div>
  );
}
