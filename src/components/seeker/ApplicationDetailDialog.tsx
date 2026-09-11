import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, MessageSquare } from "lucide-react";

import { ApplicationsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";
import { relativeTime } from "@/lib/utils";
import type { JobApplicationDto } from "@/types/api";

/**
 * What happened to one application, and the way out of it.
 *
 * Applying used to be a black box: a status, and nothing else — no history, no
 * explanation when the answer was no, and no way to step out of a pipeline after
 * taking another job. All three of those are here.
 *
 * Withdrawal asks for a reason but never requires one. Someone leaving a process
 * owes nobody an explanation, and demanding one is exactly the friction that
 * makes people abandon the form and leave a stale application behind instead —
 * which is the outcome withdrawal exists to prevent.
 */
export function ApplicationDetailDialog({
  application,
  onClose,
}: {
  application: JobApplicationDto | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const { toast } = useToast();
  const qc = useQueryClient();

  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  const [reason, setReason] = useState("");

  const timeline = useQuery({
    queryKey: ["application-timeline", application?.id],
    queryFn: () => ApplicationsApi.timeline(application!.id),
    enabled: !!application,
  });

  const withdraw = useMutation({
    mutationFn: () => ApplicationsApi.withdraw(application!.id, reason.trim() || undefined),
    onSuccess: () => {
      toast({ title: t("applications.withdrawn"), variant: "success" });
      void qc.invalidateQueries({ queryKey: ["my-applications"] });
      void qc.invalidateQueries({ queryKey: ["application-timeline"] });
      close();
    },
    onError: (e) => toast({
      title: t("common.errorOccurred"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  function close() {
    setConfirmingWithdraw(false);
    setReason("");
    onClose();
  }

  if (!application) return null;

  // HIRED and WITHDRAWN are terminal from the candidate's side: there is nothing
  // left to step out of.
  const canWithdraw =
    application.status !== "WITHDRAWN" && application.status !== "HIRED";

  const events = timeline.data ?? [];

  return (
    <Dialog open={!!application} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{application.jobTitle ?? "—"}</DialogTitle>
        </DialogHeader>

        {application.companyName && (
          <p className="-mt-2 text-sm text-muted-foreground">{application.companyName}</p>
        )}

        {/* The employer's own words, when they left any. Being told why is the
            difference between a rejection and being ghosted. */}
        {application.statusReason && (
          <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> {t("applications.reason")}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-foreground/80">
              {application.statusReason}
            </p>
          </div>
        )}

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("applications.timeline")}
          </div>

          {timeline.isLoading && (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          )}

          {!timeline.isLoading && events.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("applications.timelineEmpty")}</p>
          )}

          <ol className="space-y-3">
            {events.map((e, i) => (
              <li key={e.id} className="flex gap-3">
                {/* A rail rather than bullets: the line makes it read as one
                    process rather than a list of unrelated events. */}
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  {i < events.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
                  )}
                </div>
                <div className="pb-1">
                  <div className="text-sm font-medium text-foreground">
                    {t(`applications.events.${e.toStatus}`)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {relativeTime(e.occurredAt, locale)}
                  </div>
                  {e.note && (
                    <p className="mt-1 text-sm leading-relaxed text-foreground/75">{e.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {canWithdraw && confirmingWithdraw && (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-foreground">
              {t("applications.withdrawConfirm")}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("applications.withdrawExplain")}
            </p>
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs" htmlFor="withdraw-reason">
                {t("applications.withdrawReason")}
              </Label>
              <Textarea
                id="withdraw-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("applications.withdrawReasonHint")}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={close}>{t("common.close")}</Button>
          {canWithdraw && (
            confirmingWithdraw ? (
              <Button
                variant="destructive"
                disabled={withdraw.isPending}
                onClick={() => withdraw.mutate()}
              >
                <LogOut className="h-4 w-4" /> {t("applications.withdraw")}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setConfirmingWithdraw(true)}>
                <LogOut className="h-4 w-4" /> {t("applications.withdraw")}
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
