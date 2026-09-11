import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Motion primitives for the home page.
 *
 * Everything here degrades to a still page: when the visitor has asked their
 * operating system for reduced motion, content is simply shown and numbers
 * appear at their final value. Where IntersectionObserver is unavailable (old
 * browsers, the test DOM) content is visible from the first render, so nothing
 * can stay hidden waiting for an event that never fires.
 */

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Becomes true the first time the element scrolls into view, and stays true. */
export function useInView<T extends Element>(rootMargin = "0px 0px -10% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

/** Fades and lifts its children into place as they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Milliseconds, for staggering siblings. */
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        inView
          ? "translate-y-0 opacity-100"
          : "translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Counts up from zero to `value` once visible. Re-runs when the value arrives
 * from the network, so a count that starts at 0 while loading still animates
 * to the real figure rather than jumping.
 */
export function CountUp({
  value,
  locale,
  duration = 1400,
  className,
}: {
  value: number;
  locale: string;
  duration?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame = 0;

    // Browsers pause animation frames in tabs that are not visible, so a page
    // opened in a background tab would otherwise sit on a half-counted number.
    // This timer lands the final value regardless; timers still run, if
    // throttled, when the tab is hidden.
    const settle = window.setTimeout(() => setShown(value), prefersReducedMotion() ? 0 : duration + 50);

    if (!prefersReducedMotion()) {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setShown(Math.round(value * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    return () => {
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
    };
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {new Intl.NumberFormat(locale).format(shown)}
    </span>
  );
}
