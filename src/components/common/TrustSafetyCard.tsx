import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Flag, ShieldCheck } from "lucide-react";

import { useMutation } from "@tanstack/react-query";

import { JobsApi } from "@/api";
import { apiErrorMessage } from "@/lib/api";
import { ALL_REPORT_REASONS, type ReportReason } from "@/types/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

/**
 * Trust & safety card shown next to every job.
 *
 * Cameroon's #1 job-hunting complaint is fraud — fake recruiters and
 * "pay-to-get-hired" scams. Making safety a visible, first-class feature
 * (a permanent "never pay" notice + an easy way to report) sets the
 * platform apart from the WhatsApp groups and notice boards it competes
 * with.
 *
 * Reports now reach an administrator's moderation queue. Upholding one takes the
 * listing down; either way the reporter is told what came of it, because someone
 * who flags a fraudulent advert and hears nothing learns that reporting is
 * pointless and stops doing it.
 *
 * Signing in is not required. The people most likely to spot a "pay a deposit to
 * secure the position" advert are exactly those browsing before they trust the
 * site enough to register, and demanding an account first would filter out the
 * reports that matter most.
 */

export function TrustSafetyCard({ jobId }: { jobId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);

  const report = useMutation({
    mutationFn: (reason: ReportReason) => JobsApi.report(jobId, { reason }),
    onSuccess: () => {
      setReported(true);
      setOpen(false);
      toast({ title: t("safety.reportThanks"), variant: "success" });
    },
    onError: (e) => {
      // Failing silently would be worse than useless here: someone who thinks
      // they reported a scam and did not is left believing it is being handled.
      toast({ title: apiErrorMessage(e, t("safety.reportFailed")), variant: "destructive" });
    },
  });

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-card p-5 elev-1">
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div>
          <div className="font-display text-sm font-semibold text-foreground">
            {t("safety.title")}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("safety.neverPay")}
          </p>
        </div>
      </div>

      {reported ? (
        <div className="mt-3 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
          {t("safety.reported")}
        </div>
      ) : (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen((o) => !o)}
            className="mt-3 h-auto px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Flag className="h-3.5 w-3.5" /> {t("safety.report")}
          </Button>

          {open && (
            <div className="mt-2 space-y-1 rounded-md border border-border/50 bg-background p-2">
              <div className="px-1 pb-1 text-xs font-medium text-foreground">
                {t("safety.reportReasonPrompt")}
              </div>
              {ALL_REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  disabled={report.isPending}
                  onClick={() => report.mutate(reason)}
                  className="block w-full rounded px-2 py-1.5 text-left text-xs text-foreground/80 transition hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
                >
                  {t(`safety.reasons.${reason}`)}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
