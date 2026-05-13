import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { ApplicationsApi } from "@/api";
import { ApplicationStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/common/Pagination";
import { relativeTime } from "@/lib/utils";

export function MyApplications() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const [page, setPage] = useState(0);

  const filter = {
    page,
    size: 20,
    sortBy: "createdAt",
    sortOrder: "DESC" as const,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["my-applications-full", filter],
    queryFn: () => ApplicationsApi.list(filter),
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("applications.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("applications.subtitle")}</p>
      </header>

      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

      {data && data.content.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">{t("applications.noApplications")}</p>
          <Button asChild className="mt-4"><Link to="/jobs">{t("applications.browseJobs")}</Link></Button>
        </div>
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
                <tr key={a.id} className="border-b border-border/40 last:border-0 hover:bg-accent/30">
                  <td className="p-4">
                    <div className="font-medium">{a.jobTitle ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{a.companyName}</div>
                  </td>
                  <td className="p-4 text-muted-foreground">{relativeTime(a.applyDate, locale)}</td>
                  <td className="p-4"><ApplicationStatusBadge status={a.status} /></td>
                  <td className="p-4 text-right">
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
    </div>
  );
}
