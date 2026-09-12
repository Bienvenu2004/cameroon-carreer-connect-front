import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { CountUp, Reveal } from "./motion";

/**
 * The banner at the top of a catalogue page.
 *
 * The public pages used to open on a bare heading above a filter box, which
 * told a visitor nothing about what the page held. Each one now opens on a
 * photograph of the country the platform serves and on figures taken from the
 * page's own query, so the first screen answers "what is in here?" before any
 * filter is touched.
 *
 * Figures are live or absent. A statistic passed as `value` counts up from
 * zero once it scrolls into view; one passed as `text` (a date, a name) is
 * shown as it is. Nothing here invents a number.
 */

export type HeroStat =
  | { label: string; value: number }
  | { label: string; text: string };

export function PageHero({
  eyebrow,
  icon: Icon,
  title,
  subtitle,
  image,
  imageAlt,
  stats = [],
  children,
  className,
}: {
  eyebrow: string;
  icon?: LucideIcon;
  title: string;
  subtitle: string;
  /** Path under /public. Kept small: these are decorative, not content. */
  image: string;
  imageAlt: string;
  stats?: HeroStat[];
  /** Quick filters or a search row, shown under the subtitle. */
  children?: ReactNode;
  className?: string;
}) {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-border/60 bg-primary-50/70",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-primary-200/50 blur-3xl motion-safe:animate-blob dark:bg-primary-200/20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] rounded-bl-[10rem] bg-primary-900 dark:bg-primary-50 lg:block"
      />

      <div className="container relative mx-auto max-w-6xl py-10 lg:py-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
                {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                {eyebrow}
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {title}
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {subtitle}
              </p>
            </Reveal>

            {children && <Reveal delay={220}>{children}</Reveal>}

            {stats.length > 0 && (
              <Reveal delay={280}>
                <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-5">
                  {stats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {stat.label}
                      </dt>
                      <dd className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
                        {"value" in stat ? (
                          <CountUp value={stat.value} locale={locale} />
                        ) : (
                          stat.text
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
          </div>

          {/* Decorative: the page reads identically without it, so it is kept
              off small screens rather than shrunk into a letterbox. */}
          <Reveal delay={120} className="hidden lg:block">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-accent/25 blur-2xl"
              />
              <img
                src={image}
                alt={imageAlt}
                loading="lazy"
                decoding="async"
                className="relative aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl shadow-primary/10 ring-1 ring-border/60"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
