import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";

/**
 * Profile completeness meter.
 *
 * Recommendations, candidate search and matching all degrade badly against thin
 * profiles, and most people fill in the minimum unless prompted — so this is the
 * cheapest lever available on data quality, and it pays into every other feature
 * on the platform.
 *
 * The hints arrive from the backend as i18n keys rather than sentences: the
 * server decides what is missing and how much it matters, the client decides
 * which language to say it in.
 */
export function ProfileCompleteness({
  score,
  hints,
}: {
  score?: number | null;
  hints?: string[];
}) {
  const { t } = useTranslation();

  if (score == null) return null;

  const complete = score >= 100;
  // Amber below half rather than red: a new profile is incomplete by definition,
  // and scolding someone on their first visit is not encouragement.
  const tone = complete ? "bg-success" : score >= 50 ? "bg-primary" : "bg-warning";

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 elev-1">
      <div className="flex items-baseline justify-between">
        <div className="font-display text-sm font-semibold text-foreground">
          {t("profile.completeness")}
        </div>
        <div className="font-display text-lg font-bold tabular-nums text-foreground">
          {score}%
        </div>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>

      {complete ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> {t("common.successSaved")}
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {t("profile.completenessHint")}
          </p>
          {hints && hints.length > 0 && (
            <ul className="mt-2.5 space-y-1">
              {/* Three at a time. A list of nine outstanding items is a wall,
                  not a nudge, and people act on the first thing they read. */}
              {hints.slice(0, 3).map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  {t(key)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
