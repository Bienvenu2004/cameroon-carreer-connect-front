import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, Bookmark, Briefcase, Coins,
  MapPin, Sparkles,
} from "lucide-react";

import { relativeTime, formatSalaryRange } from "@/lib/utils";
import type { JobDto, RecommendationDto } from "@/types/api";

/**
 * Compact, premium recommendation card.
 *
 * Design priorities (in order):
 *   1. Job title is the focal point.
 *   2. Match score is visible but secondary — a small pill, never a donut.
 *   3. AI reasoning is the differentiator — given the most generous block
 *      of vertical space, with a graceful show-more/less when it overflows.
 *   4. Metadata collapses to a single line with bullet separators.
 *   5. Actions and "posted X ago" share the same row to save height.
 *
 * No nested-card chrome (avoid the "card inside a card" effect): the AI
 * block uses a subtle tinted background, not its own border. Card itself
 * has a soft hover lift (shadow + border-tint) — Linear/Stripe-ish, not
 * Material-y.
 *
 * Shared by both the dashboard widget (RecommendationsSection) and the
 * dedicated page (RecommendedJobsPage). One source of truth for the
 * card shape means a single place to evolve.
 */

export function RecommendationCard({
  rec, factors, extraFactors, onSave, isSaving,
}: {
  rec: RecommendationDto;
  factors: string[];
  extraFactors: number;
  onSave: (jobId: string) => void;
  isSaving: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const { job, score, reason } = rec;

  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const tier = tierKey(score);

  const company = job.company?.name ?? "—";
  const city = job.location?.city ?? "—";
  const region = job.location?.region;

  // Show-more / show-less for the AI reason. We measure the clamped
  // paragraph; if scrollHeight exceeds clientHeight, the text overflows
  // and we render the toggle. When the user expands, we skip remeasuring
  // (the unclamped state has its own height).
  const pRef = useRef<HTMLParagraphElement>(null);
  const [canExpand, setCanExpand] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useLayoutEffect(() => {
    if (expanded) return;
    const el = pRef.current;
    if (!el) return;
    setCanExpand(el.scrollHeight > el.clientHeight + 1);
  }, [reason, expanded]);

  const salaryLabel = formatSalaryRange(job.salaryMin, job.salaryMax, locale);


  return (
    <article
      className="group relative flex flex-col rounded-xl border border-border/50 bg-card p-4 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,0.18)]"
    >
      {/* Top row: match pill + verified mark on the right when present */}
      <div className="flex items-start justify-between gap-2">
        <MatchPill pct={pct} tier={tier} label={t(`ai.tier.${tier}`)} />
      </div>

      {/* Title + company */}
      <div className="mt-2.5 min-w-0">
        <h3 className="font-display text-[15px] font-semibold leading-snug tracking-tight">
          <Link
            to={`/jobs/${job.id}`}
            className="line-clamp-2 text-foreground hover:text-primary"
          >
            {job.title}
          </Link>
        </h3>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate font-medium text-foreground/75">{company}</span>
          {job.company?.status === "APPROVED" && (
            <BadgeCheck
              className="h-3.5 w-3.5 shrink-0 text-primary"
              aria-label="Verified"
            />
          )}
        </div>
      </div>

      {/* Metadata one-liner with bullets */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-muted-foreground">
        <Meta icon={MapPin} label={`${city}${region ? `, ${region}` : ""}`} />
        {job.type && <Dot />}
        {job.type && <Meta icon={Briefcase} label={job.type} />}
        {salaryLabel && <Dot />}
        {salaryLabel && <Meta icon={Coins} label={salaryLabel} />}
      </div>

      {/* AI reason — subtle tint, no border. Sparkle reinforces AI origin. */}
      <div className="mt-3 rounded-md bg-primary/[0.05] px-3 py-2.5">
        <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" /> {t("ai.whyMatchShort")}
        </div>
        <p
          ref={pRef}
          className={
            "mt-1 text-[12.5px] leading-[1.55] text-foreground/85 " +
            (expanded ? "" : "line-clamp-3")
          }
          title={expanded ? undefined : reason}
        >
          {reason}
        </p>
        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 text-[11px] font-medium text-primary transition hover:underline"
          >
            {expanded ? t("ai.showLess") : t("ai.showMore")}
          </button>
        )}
        {factors.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {factors.map((f) => (
              <span
                key={f}
                className="inline-flex items-center rounded bg-primary/10 px-1.5 py-[1px] text-[10.5px] font-medium text-primary"
              >
                {f}
              </span>
            ))}
            {extraFactors > 0 && (
              <span className="inline-flex items-center rounded bg-muted px-1.5 py-[1px] text-[10.5px] font-medium text-muted-foreground">
                {t("ai.moreFactors", { count: extraFactors })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: posted-ago + lightweight Save + primary View-Job CTA — single row */}
      <footer className="mt-3 flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <span className="truncate text-[11px] text-muted-foreground">
          {job.createdAt
            ? t("ai.postedAgo", { time: relativeTime(job.createdAt, locale) })
            : ""}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSave(job.id)}
            disabled={isSaving}
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-40"
          >
            <Bookmark className="h-3.5 w-3.5" />
            {t("ai.save")}
          </button>
          <Link
            to={`/jobs/${job.id}`}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary transition hover:gap-1.5"
          >
            {t("ai.viewJob")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </footer>
    </article>
  );
}

/* -------------------- pill + helpers -------------------- */

function MatchPill({
  pct, tier, label,
}: {
  pct: number;
  tier: ReturnType<typeof tierKey>;
  label: string;
}) {
  const style =
    tier === "topMatch"
      ? "bg-primary/12 text-primary ring-primary/15"
      : tier === "greatMatch"
      ? "bg-emerald-500/12 text-emerald-700 ring-emerald-500/15 dark:text-emerald-400"
      : tier === "goodMatch"
      ? "bg-amber-500/12 text-amber-700 ring-amber-500/15 dark:text-amber-400"
      : "bg-muted text-muted-foreground ring-border";
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset " +
        style
      }
      aria-label={`${pct}% match — ${label}`}
    >
      <Sparkles className="h-3 w-3" />
      <span className="tabular-nums">{pct}%</span>
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
        {label}
      </span>
    </span>
  );
}

function Meta({
  icon: Icon, label,
}: {
  icon: typeof MapPin;
  label: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground/70" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function Dot() {
  return <span className="text-muted-foreground/40">•</span>;
}

/* -------------------- shared utilities -------------------- */

export function tierKey(
  score: number,
): "topMatch" | "greatMatch" | "goodMatch" | "fairMatch" {
  if (score >= 0.85) return "topMatch";
  if (score >= 0.70) return "greatMatch";
  if (score >= 0.55) return "goodMatch";
  return "fairMatch";
}

/**
 * Derive "Key matching factors" client-side from the intersection of the
 * seeker's skills and tokens present in the job title + description.
 * Case-insensitive substring match — good enough for keyword skills like
 * "React", "Python". Misses synonyms; lift server-side later if needed.
 */
export function computeMatchingFactors(
  skills: string[],
  job: JobDto,
  max = 4,
): { tags: string[]; extra: number } {
  if (!skills.length) return { tags: [], extra: 0 };
  const haystack = `${job.title ?? ""} ${job.description ?? ""}`.toLowerCase();
  const seen = new Set<string>();
  const hits: string[] = [];
  for (const s of skills) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    if (haystack.includes(key)) {
      seen.add(key);
      hits.push(s);
    }
  }
  return { tags: hits.slice(0, max), extra: Math.max(0, hits.length - max) };
}
