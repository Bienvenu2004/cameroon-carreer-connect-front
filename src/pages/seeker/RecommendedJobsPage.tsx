import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, SlidersHorizontal } from "lucide-react";

import { AiApi, SavedJobsApi, SeekerApi } from "@/api";
import {
  RecommendationCard,
  computeMatchingFactors,
  tierKey,
} from "@/components/seeker/RecommendationCard";

/**
 * Dedicated page for AI-recommended jobs. Lives at /seeker/recommendations.
 *
 * Renders the SAME <RecommendationCard /> used by the dashboard widget —
 * a single source of truth for the card design.
 *
 * Controls:
 *   - Sort: match (default) / newest / salary
 *   - Filter: tier chips (All / Top / Great / Good / Fair)
 *
 * Pagination is intentionally omitted: the backend caps the response at
 * `app.ai.recommendations.return-size` (5). If that cap grows, drop in
 * a simple page slicer here.
 */

type SortKey = "match" | "newest" | "salary";
type TierFilter = "all" | "topMatch" | "greatMatch" | "goodMatch" | "fairMatch";

const TIERS: TierFilter[] = ["all", "topMatch", "greatMatch", "goodMatch", "fairMatch"];

export function RecommendedJobsPage() {
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

  const [sort, setSort] = useState<SortKey>("match");
  const [tier, setTier] = useState<TierFilter>("all");

  const recs = recsQ.data ?? [];
  const filtered = useMemo(() => {
    let list = [...recs];
    if (tier !== "all") list = list.filter((r) => tierKey(r.score) === tier);
    list.sort((a, b) => {
      if (sort === "match") return b.score - a.score;
      if (sort === "newest") {
        const ad = a.job.createdAt ? Date.parse(a.job.createdAt) : 0;
        const bd = b.job.createdAt ? Date.parse(b.job.createdAt) : 0;
        return bd - ad;
      }
      const as = a.job.salary != null ? Number(a.job.salary) : -1;
      const bs = b.job.salary != null ? Number(b.job.salary) : -1;
      return bs - as;
    });
    return list;
  }, [recs, sort, tier]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          {t("recommendedPage.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("recommendedPage.subtitle")}
        </p>
      </header>

      {/* Toolbar */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{t("recommendedPage.sortBy")}</span>
            <SortPill label={t("recommendedPage.sort.match")} active={sort === "match"} onClick={() => setSort("match")} />
            <SortPill label={t("recommendedPage.sort.newest")} active={sort === "newest"} onClick={() => setSort("newest")} />
            <SortPill label={t("recommendedPage.sort.salary")} active={sort === "salary"} onClick={() => setSort("salary")} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">{t("recommendedPage.filter")}</span>
            {TIERS.map((k) => (
              <SortPill
                key={k}
                label={k === "all" ? t("recommendedPage.tierAll") : t(`ai.tier.${k}`)}
                active={tier === k}
                onClick={() => setTier(k)}
              />
            ))}
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            {t("recommendedPage.count", { count: filtered.length, total: recs.length })}
          </div>
        </div>
      </div>

      {recsQ.isLoading && <LoadingGrid />}
      {!recsQ.isLoading && recsQ.isError && <EmptyNotice message={t("ai.error")} />}
      {!recsQ.isLoading && !recsQ.isError && recs.length === 0 && (
        <EmptyNotice message={t("ai.empty")} />
      )}
      {!recsQ.isLoading && !recsQ.isError && recs.length > 0 && filtered.length === 0 && (
        <EmptyNotice message={t("recommendedPage.noMatchForFilter")} />
      )}

      {!recsQ.isLoading && !recsQ.isError && filtered.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const { tags, extra } = computeMatchingFactors(skillNames, r.job);
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
      )}
    </div>
  );
}

/* -------------------- bits -------------------- */

function SortPill({
  label, active, onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs font-medium transition " +
        (active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")
      }
    >
      {label}
    </button>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="space-y-2.5 rounded-xl border border-border/60 bg-card p-4">
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted" />
          <div className="h-16 w-full animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyNotice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
