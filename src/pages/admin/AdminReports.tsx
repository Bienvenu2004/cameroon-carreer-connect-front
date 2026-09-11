import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, ShieldCheck, ShieldX } from "lucide-react";

import { ReportsApi } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/common/Pagination";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";
import { relativeTime } from "@/lib/utils";
import type { ReportStatus } from "@/types/api";

/**
 * Moderation queue for reported listings.
 *
 * Shaped like the company approval queue the admin already knows, because it is
 * the same job: look at what a user flagged, decide, and move on. The listing's
 * total report count is shown on every row — three separate people flagging one
 * advert is a very different signal from one, and that is the difference between
 * a grudge and a scam.
 */
export function AdminReports() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const { toast } = useToast();
  const qc = useQueryClient();

  const [status, setStatus] = useState<ReportStatus | "ALL">("PENDING");
  const [page, setPage] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", status, page],
    queryFn: () => ReportsApi.list({
      status: status === "ALL" ? undefined : status,
      page,
      size: 20,
    }),
  });

  const resolve = useMutation({
    mutationFn: ({ id, upheld }: { id: string; upheld: boolean }) =>
      ReportsApi.resolve(id, { upheld, note: notes[id]?.trim() || undefined }),
    onSuccess: () => {
      toast({ title: t("reports.resolved"), variant: "success" });
      void qc.invalidateQueries({ queryKey: ["admin-reports"] });
      void qc.invalidateQueries({ queryKey: ["admin-reports-pending"] });
    },
    onError: (e) => toast({
      title: t("common.errorOccurred"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  const reports = data?.content ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("reports.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("reports.subtitle")}</p>
      </header>

      <div className="mb-5 flex gap-2">
        {(["PENDING", "ALL"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => { setStatus(s); setPage(0); }}
          >
            {s === "PENDING" ? t("reports.pending") : t("reports.all")}
          </Button>
        ))}
      </div>

      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

      {!isLoading && reports.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/70 px-6 py-12 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-success/70" />
          <p className="font-medium text-foreground">{t("reports.none")}</p>
        </div>
      )}

      <ul className="space-y-3">
        {reports.map((r) => (
          <li key={r.id} className="rounded-xl border border-border/60 bg-card p-4 elev-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={r.reason === "SCAM" ? "destructive" : "warning"}>
                    {t(`safety.reasons.${r.reason}`)}
                  </Badge>
                  <Badge variant="secondary">{t(`reports.statuses.${r.status}`)}</Badge>
                  {r.totalReportsForJob > 1 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {t("reports.reportCount", { count: r.totalReportsForJob })}
                    </Badge>
                  )}
                  <Badge variant={r.jobActive ? "default" : "secondary"}>
                    {r.jobActive ? t("reports.listingLive") : t("reports.listingDown")}
                  </Badge>
                </div>

                <div className="mt-2 font-display font-semibold text-foreground">
                  {r.jobTitle ?? "—"}
                </div>
                {r.companyName && (
                  <div className="text-sm text-muted-foreground">{r.companyName}</div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">
                  {relativeTime(r.createdAt, locale)}
                </div>
              </div>

              {r.jobId && (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/jobs/${r.jobId}`} target="_blank" rel="noopener noreferrer">
                    {t("jobs.details")} <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>

            {r.details && (
              <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm leading-relaxed text-foreground/80">
                {r.details}
              </p>
            )}

            {r.status === "PENDING" ? (
              <div className="mt-4 space-y-2 border-t border-border/50 pt-3">
                <Label className="text-xs" htmlFor={`note-${r.id}`}>{t("reports.note")}</Label>
                <Textarea
                  id={`note-${r.id}`}
                  rows={2}
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolve.isPending}
                    onClick={() => resolve.mutate({ id: r.id, upheld: false })}
                  >
                    <ShieldX className="h-3.5 w-3.5" /> {t("reports.dismiss")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={resolve.isPending}
                    onClick={() => resolve.mutate({ id: r.id, upheld: true })}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> {t("reports.uphold")}
                  </Button>
                </div>
              </div>
            ) : (
              r.resolutionNote && (
                <p className="mt-3 border-t border-border/50 pt-3 text-sm text-muted-foreground">
                  {r.resolutionNote}
                </p>
              )
            )}
          </li>
        ))}
      </ul>

      {reports.length > 0 && (
        <Pagination
          page={page}
          totalPages={data?.totalPages ?? 1}
          isLast={data?.isLast ?? true}
          totalElements={data?.totalElements ?? 0}
          onChange={setPage}
        />
      )}
    </div>
  );
}
