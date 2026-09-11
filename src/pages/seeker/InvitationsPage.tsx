import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, CheckCircle2, Mail } from "lucide-react";

import { CandidatesApi } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/common/Pagination";
import { relativeTime } from "@/lib/utils";

/**
 * The candidate's side of candidate search.
 *
 * An invitation is an employer saying "this looks like you, would you apply" —
 * not a message thread and not an obligation. The page is built to make that
 * clear: the only action is to look at the job, and ignoring an invitation is a
 * perfectly good outcome that costs the candidate nothing.
 */
export function InvitationsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["invitations", page],
    queryFn: () => CandidatesApi.myInvitations(page, 10),
  });

  const invitations = data?.content ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("invitations.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("invitations.subtitle")}</p>
      </header>

      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

      {!isLoading && invitations.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/70 px-6 py-12 text-center">
          <Mail className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium text-foreground">{t("invitations.none")}</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            {t("invitations.noneHint")}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/seeker/profile">{t("nav.profile")}</Link>
          </Button>
        </div>
      )}

      {invitations.length > 0 && (
        <>
          <ul className="space-y-3">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="rounded-xl border border-border/60 bg-card p-4 elev-1"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-foreground">
                      {inv.jobTitle}
                    </div>
                    {inv.companyName && (
                      <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        {t("invitations.from")} {inv.companyName}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {relativeTime(inv.sentAt, locale)}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {inv.respondedAt && (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {t("invitations.applied")}
                      </Badge>
                    )}
                    {!inv.jobStillOpen && (
                      <Badge variant="secondary">{t("invitations.jobClosed")}</Badge>
                    )}
                    {inv.jobId && inv.jobStillOpen && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/jobs/${inv.jobId}`}>
                          {t("invitations.viewJob")} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                {inv.message && (
                  <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm leading-relaxed text-foreground/80">
                    {inv.message}
                  </p>
                )}
              </li>
            ))}
          </ul>

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
