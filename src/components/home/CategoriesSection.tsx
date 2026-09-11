import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { INDUSTRY_ICONS } from "@/lib/industryIcons";
import { cn } from "@/lib/utils";
import { ALL_INDUSTRIES } from "@/types/api";

import { industryCountsQuery } from "./homeQueries";
import { Reveal } from "./motion";

/**
 * Industry categories as a swipeable carousel.
 *
 * Industries with employers come first: those are the ones a visitor can act
 * on. Every industry is still present further along, so the carousel is the
 * same length for everyone and an empty sector is shown honestly with its
 * count of zero rather than silently missing.
 *
 * Scrolling is native (scroll-snap), so it works with touch, trackpad and
 * keyboard. The arrows and dots are a convenience on top, not the mechanism.
 */
export function CategoriesSection() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(industryCountsQuery);
  const counts = new Map(data?.map((row) => [row.industry, row.count]) ?? []);
  const ordered = [...ALL_INDUSTRIES].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));

  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  const measure = () => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    setPages(Math.max(1, Math.ceil((el.scrollWidth - 4) / el.clientWidth)));
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  };

  useEffect(() => {
    const el = track.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToPage = (target: number) => {
    const el = track.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(pages - 1, target));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section className="py-20">
      <div className="container mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("home.categoriesTitle")}
              </h2>
              <p className="mt-2 text-muted-foreground">{t("home.categoriesSubtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/industries"
                className="mr-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                {t("home.allCategories")}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <ArrowButton label={t("home.prev")} disabled={page === 0} onClick={() => scrollToPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </ArrowButton>
              <ArrowButton label={t("home.next")} disabled={page >= pages - 1} onClick={() => scrollToPage(page + 1)}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </ArrowButton>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div
            ref={track}
            onScroll={measure}
            className="-mx-1 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {ordered.map((industry) => {
              const Icon = INDUSTRY_ICONS[industry];
              const count = counts.get(industry) ?? 0;
              return (
                <Link
                  key={industry}
                  to={`/jobs?industry=${industry}`}
                  className="group flex shrink-0 basis-[calc(50%-0.5rem)] snap-start flex-col items-center rounded-2xl border border-transparent bg-primary-50 px-4 py-6 text-center transition duration-300 hover:-translate-y-1.5 hover:border-primary/20 hover:bg-card hover:shadow-xl hover:shadow-primary/10 dark:bg-card sm:basis-[calc(33.333%-0.667rem)] lg:basis-[calc(16.666%-0.834rem)]"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-card text-primary shadow-sm transition duration-300 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground dark:bg-primary-50">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="mt-4 flex min-h-[2.5rem] items-center font-display text-sm font-semibold leading-tight text-foreground">
                    {t(`industries.${industry}`)}
                  </span>
                  <span className="mt-2 text-xs text-muted-foreground">
                    {isLoading ? t("common.loading") : t("industries.companyCount", { count })}
                  </span>
                </Link>
              );
            })}
          </div>
        </Reveal>

        {pages > 1 && (
          <div className="mt-2 flex justify-center gap-2">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={t("home.goToSlide", { n: i + 1 })}
                aria-current={i === page ? "true" : undefined}
                onClick={() => scrollToPage(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === page ? "w-8 bg-primary" : "w-2 bg-primary/25 hover:bg-primary/50",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
