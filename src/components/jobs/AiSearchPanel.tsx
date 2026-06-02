import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Search, AlertCircle, X, SlidersHorizontal, RefreshCw,
} from "lucide-react";

import { AiApi } from "@/api";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/common/JobCard";
import type { AiInterpretationDto, AiSearchResponseDto } from "@/types/api";

/**
 * Natural-language job search panel (§5.2 of the product spec).
 *
 * Renders the alternative-mode surface on the /jobs page:
 *   - Hero textarea for free-form queries in EN or FR.
 *   - On submit, calls POST /api/hjp/ai/search.
 *   - Renders the AI's interpretation as removable chips above the
 *     result grid so the user can see what filter was applied.
 *   - If the backend returned usedFallback=true, shows a banner
 *     explaining that we fell back to keyword search (the model
 *     couldn't extract structured signal from the query).
 *
 * "Refine in classic mode" hand-off: the visible (un-hidden) chips
 * become URL params on /jobs?mode=classic, so users who want to nudge
 * the filter manually keep all the AI's groundwork without restarting.
 * Hidden chips drop out of the hand-off — that's the simplest "remove
 * this filter" semantic without a second model call.
 *
 * Submit shortcut: Cmd/Ctrl+Enter inside the textarea submits the form.
 */
export function AiSearchPanel({
  initialQuery,
  onQueryChange,
}: {
  initialQuery?: string;
  onQueryChange?: (q: string) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery ?? "");
  const [hiddenChips, setHiddenChips] = useState<Set<string>>(new Set());

  const searchM = useMutation({
    mutationFn: (q: string) => AiApi.search(q.trim(), 24),
    onSuccess: (data, q) => {
      // Lightweight client telemetry. One line per successful search so
      // future analytics (Mixpanel / PostHog / a custom queries table)
      // can hook in here. NO PII — only the parse signal.
      // eslint-disable-next-line no-console
      console.info("[ai-search]", {
        queryLen: q.length,
        confidence: data.confidence,
        usedFallback: data.usedFallback,
        results: data.totalResults,
      });
    },
  });

  const result: AiSearchResponseDto | undefined = searchM.data;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setHiddenChips(new Set()); // reset chip hiding on a fresh search
    searchM.mutate(trimmed);
    onQueryChange?.(trimmed);
  };

  // Cmd/Ctrl+Enter inside the textarea submits — handy for verbose queries.
  const onTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      // Touch a hidden submit button on the parent form. Easier than
      // bubbling a synthetic submit event up.
      (e.currentTarget.form ?? null)?.requestSubmit();
    }
  };

  const clear = () => {
    searchM.reset();
    setQuery("");
    setHiddenChips(new Set());
    onQueryChange?.("");
  };

  const refineInClassic = () => {
    if (!result) return;
    const params = interpretationToClassicParams(result.interpretation, hiddenChips, query);
    navigate({ pathname: "/jobs", search: `?${params.toString()}` });
  };

  const chips = result ? buildChips(result, hiddenChips, t) : [];

  // Pre-compute the three result states so the JSX stays flat.
  const hasResults = !!result && result.jobs.length > 0;
  const hasNoResults = !!result && result.jobs.length === 0;

  return (
    <div className="space-y-4">
      {/* Query form */}
      <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card p-5 elev-1">
        <label
          htmlFor="ai-search-query"
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          {t("aiSearch.label")}
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("aiSearch.hint")}
          <span className="ml-1 text-muted-foreground/70">{t("aiSearch.submitShortcut")}</span>
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <textarea
            id="ai-search-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onTextareaKeyDown}
            rows={2}
            maxLength={500}
            placeholder={t("aiSearch.placeholder")}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              size="lg"
              disabled={searchM.isPending || !query.trim()}
              className="h-auto flex-1 gap-2 sm:flex-none sm:px-6"
            >
              <Search className="h-4 w-4" />
              {searchM.isPending ? t("aiSearch.loading") : t("aiSearch.submit")}
            </Button>
            {(result || searchM.isError) && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={clear}
                aria-label={t("aiSearch.clear")}
                className="h-auto gap-1.5 sm:px-4"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">{t("aiSearch.tryAgain")}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Example queries — clickable to populate the textarea */}
        {!result && !searchM.isPending && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{t("aiSearch.tryExamples")}:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.key}
                type="button"
                onClick={() => setQuery(t(`aiSearch.examples.${ex.key}`))}
                className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {t(`aiSearch.examples.${ex.key}`)}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Error state — only for transport / 5xx; the backend never throws on AI failure */}
      {searchM.isError && (
        <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {t("aiSearch.error")}
        </div>
      )}

      {/* Result panel */}
      {result && (
        <>
          {/* Fallback banner */}
          {result.usedFallback && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <div className="font-medium text-foreground">
                  {t("aiSearch.fallbackTitle")}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("aiSearch.fallbackBody")}
                </p>
              </div>
            </div>
          )}

          {/* Interpretation chips + Refine-in-classic CTA */}
          {!result.usedFallback && chips.length > 0 && (
            <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("aiSearch.interpretationLabel")}
                </div>
                <button
                  type="button"
                  onClick={refineInClassic}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:underline"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {t("aiSearch.refineInClassic")}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-primary"
                  >
                    <span className="text-primary/70">{c.label}:</span>
                    <span>{c.value}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(hiddenChips);
                        next.add(c.id);
                        setHiddenChips(next);
                      }}
                      aria-label={`${t("jobs.removeFilter")} — ${c.label}`}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-primary/60 transition hover:bg-primary/10 hover:text-primary"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Result count */}
          {hasResults && (
            <div className="text-sm text-muted-foreground">
              {t("aiSearch.resultsCount", { count: result.totalResults })}
            </div>
          )}

          {/* Results grid */}
          {hasResults && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {result.jobs.map((j) => <JobCard key={j.id} job={j} />)}
            </div>
          )}

          {/* No-results states — distinguishes "AI parsed cleanly but no
              matches" from "AI gave up AND no keyword matches either". */}
          {hasNoResults && !result.usedFallback && (
            <NoMatchState
              title={t("aiSearch.empty.parsedTitle")}
              body={t("aiSearch.empty.parsedBody")}
              ctaLabel={t("aiSearch.refineInClassic")}
              onCta={refineInClassic}
            />
          )}
          {hasNoResults && result.usedFallback && (
            <NoMatchState
              title={t("aiSearch.empty.fallbackTitle")}
              body={t("aiSearch.empty.fallbackBody")}
              ctaLabel={t("aiSearch.switchToClassic")}
              onCta={() => navigate("/jobs")}
            />
          )}
        </>
      )}

      {/* First-load loading state */}
      {searchM.isPending && !result && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== sub-components ============================== */

function NoMatchState({
  title, body, ctaLabel, onCta,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCta}
        className="mt-4 gap-1.5"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {ctaLabel}
      </Button>
    </div>
  );
}

/* ============================== helpers ============================== */

/** Spec §5.2 examples, surfaced as clickable suggestions. */
const EXAMPLES = [
  { key: "remoteJunior" },
  { key: "marketingIntern" },
  { key: "springBootBackend" },
  { key: "accountingDouala" },
] as const;

type Chip = { id: string; label: string; value: string };

function buildChips(
  result: AiSearchResponseDto,
  hidden: Set<string>,
  t: (k: string, opts?: object) => string,
): Chip[] {
  const i = result.interpretation;
  const out: Chip[] = [];

  const push = (id: string, label: string, value: string | null | undefined) => {
    if (!value) return;
    if (hidden.has(id)) return;
    out.push({ id, label, value });
  };

  push("region", t("jobs.region"), i.region ? t(`regions.${i.region}`, { defaultValue: i.region }) : null);
  push("city", t("aiSearch.chip.city"), i.city);
  push("jobType", t("jobs.jobType"), i.jobType ? t(`jobTypes.${i.jobType}`, { defaultValue: i.jobType }) : null);
  push("jobSite", t("jobs.jobSite"), i.jobSite ? t(`jobSites.${i.jobSite}`, { defaultValue: i.jobSite }) : null);
  push("language", t("jobs.language"), i.language ? t(`jobs.languages.${i.language}`, { defaultValue: i.language }) : null);
  push("industry", t("jobs.industry"), i.industry ? t(`industries.${i.industry}`, { defaultValue: i.industry }) : null);
  push("level", t("aiSearch.chip.level"), i.level ? t(`experienceLevels.${i.level}`, { defaultValue: i.level }) : null);

  // Skills + keywords: one chip per item, capped to keep the row tidy
  i.skills.slice(0, 5).forEach((s, idx) =>
    push(`skill-${idx}`, t("aiSearch.chip.skill"), s),
  );

  if (i.salaryMin != null || i.salaryMax != null) {
    const min = i.salaryMin ?? "?";
    const max = i.salaryMax ?? "?";
    push("salary", t("jobs.salary"), `${min} – ${max} XAF`);
  }

  return out;
}

/**
 * Translate the AI's interpretation into the same query-param vocabulary
 * the classic /jobs page reads — so "Refine in classic" feels like a
 * pure mode-switch, not a fresh start. Hidden chips are excluded.
 *
 * Param keys match the ones JobsPage.writeUrl() already produces:
 *   q | region | industry | type | site | lang
 */
function interpretationToClassicParams(
  i: AiInterpretationDto,
  hidden: Set<string>,
  fallbackQuery: string,
): URLSearchParams {
  const p = new URLSearchParams();
  // Stay in classic mode after the hand-off
  // (don't set ?mode=ai, classic is the default — but be explicit so
  //  shared links don't accidentally re-enter AI mode).
  p.set("mode", "classic");

  // Keyword: prefer the first AI-extracted keyword, else fall back to
  // the user's original query so the title-LIKE has something to match.
  const kw = i.keywords?.[0] ?? fallbackQuery;
  if (kw && kw.trim()) p.set("q", kw.trim());

  if (i.region && !hidden.has("region")) p.set("region", i.region);
  if (i.industry && !hidden.has("industry")) p.set("industry", i.industry);
  if (i.jobType && !hidden.has("jobType")) p.set("type", i.jobType);
  if (i.jobSite && !hidden.has("jobSite")) p.set("site", i.jobSite);
  if (i.language && !hidden.has("language")) p.set("lang", i.language);

  return p;
}
