import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind class concatenator with merge dedupe. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format number with locale-aware thousands separator. */
export function formatNumber(n: number | null | undefined, locale = "fr-FR") {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat(locale).format(n);
}

/** Format XAF currency. */
export function formatXAF(value: number | string | null | undefined, locale = "fr-FR") {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Render a job's advertised pay.
 *
 * Jobs carry a band rather than a single figure, and either bound may be absent:
 * a minimum alone reads as "from X", a maximum alone as "up to X", and equal
 * bounds collapse to one number rather than repeating themselves. Returns null
 * when no pay is stated, so callers can omit the row entirely instead of
 * printing a dash where a salary should be.
 */
export function formatSalaryRange(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
  locale = "fr-FR",
  labels?: { from?: string; upTo?: string },
): string | null {
  const lo = min === null || min === undefined || min === "" ? null : Number(min);
  const hi = max === null || max === undefined || max === "" ? null : Number(max);
  const loOk = lo !== null && !Number.isNaN(lo);
  const hiOk = hi !== null && !Number.isNaN(hi);

  if (!loOk && !hiOk) return null;
  if (loOk && hiOk) {
    return lo === hi
      ? formatXAF(lo, locale)
      : `${formatXAF(lo, locale)} – ${formatXAF(hi, locale)}`;
  }
  if (loOk) return `${labels?.from ?? "From"} ${formatXAF(lo, locale)}`;
  return `${labels?.upTo ?? "Up to"} ${formatXAF(hi, locale)}`;
}

/** Relative time helper (e.g. "il y a 3 jours"). */
export function relativeTime(date: string | Date | null | undefined, locale = "fr-FR") {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diff < 60) return rtf.format(-Math.round(diff), "second");
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  if (diff < 2592000) return rtf.format(-Math.round(diff / 86400), "day");
  if (diff < 31536000) return rtf.format(-Math.round(diff / 2592000), "month");
  return rtf.format(-Math.round(diff / 31536000), "year");
}

/** Initials from a name string. */
export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
