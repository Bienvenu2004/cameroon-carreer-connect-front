import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

import { AiApi, SavedJobsApi, SeekerApi } from "@/api";
import {
  RecommendationCard,
  computeMatchingFactors,
} from "@/components/seeker/RecommendationCard";

/* ------------------------------------------------------------------ *
 *  AI Recommendations widget for the seeker dashboard.
 *
 *  Wraps the shared <RecommendationCard /> in a paginated grid.
 *  Cards-per-page scales with the
 *  viewport: 1 (sm), 2 (md), 3 (xl). Every card on every page is a
 *  recommendation we already received — pagination is purely for
 *  visual density, no extra fetches.
 *
 *  "View all recommended jobs" lives on the sidebar nav now, not here:
 *  every rec the API returned is reachable via the pager, so an extra
 *  link inside the widget was redundant.
 * ------------------------------------------------------------------ */

const PAGE_SIZE = 3;
const MAX_FACTOR_TAGS = 4;

export function RecommendationsSection() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const recsQ = useQuery({
    queryKey: ["ai-recommendations"],
    queryFn: () => AiApi.recommendations(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const profileQ = useQuery({
    queryKey: ["seeker-profile-me"],
    queryFn: () => SeekerApi.me(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const skillNames = useMemo<string[]>(
    () => (profileQ.data?.skills ?? [])
      .map((s) => s?.name)
      .filter((n): n is string => !!n && n.trim().length > 0),
    [profileQ.data],
  );

  const saveM = useMutation({
    mutationFn: (jobId: string) => SavedJobsApi.toggle(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-saved-jobs"] }),
  });

  const recs = recsQ.data ?? [];
  const isLoading = recsQ.isLoading;
  const isError = recsQ.isError;
  const isEmpty = !isLoading && !isError && recs.length === 0;

  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(recs.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = recs.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            {t("ai.recommendationsTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("ai.recommendationsSubtitle")}
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" /> {t("ai.poweredBy")}
        </span>
      </div>

      <div className="mt-5">
        {isLoading && <LoadingState />}
        {!isLoading && isError && <EmptyNotice message={t("ai.error")} />}
        {!isLoading && !isError && isEmpty && <EmptyNotice message={t("ai.empty")} />}

        {!isLoading && !isError && recs.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((r) => {
                const { tags, extra } = computeMatchingFactors(
                  skillNames, r.job, MAX_FACTOR_TAGS,
                );
                return (
                  <RecommendationCard
                    key={r.id}
                    rec={r}
                    factors={tags}
                    extraFactors={extra}
                    onSave={(id) => saveM.mutate(id)}
                    isSaving={saveM.isPending}
                  />
                );
              })}
            </div>

            {pageCount > 1 && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <PagerButton
                  direction="prev"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                />
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Page ${i + 1}`}
                      onClick={() => setPage(i)}
                      className={
                        "h-2 rounded-full transition-all " +
                        (i === safePage
                          ? "w-6 bg-primary"
                          : "w-2 bg-border hover:bg-muted-foreground/40")
                      }
                    />
                  ))}
                </div>
                <PagerButton
                  direction="next"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------- bits -------------------- */

function PagerButton({
  direction, disabled, onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous" : "Next"}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function LoadingState() {
  return (
    <div
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Loading recommendations"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="space-y-2.5 rounded-xl border border-border/60 bg-card p-4"
        >
          <SkBlock className="h-5 w-20 rounded-full" />
          <SkBlock className="h-4 w-3/4" />
          <SkBlock className="h-3 w-1/2" />
          <SkBlock className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyNotice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function SkBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}
