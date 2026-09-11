import { useTranslation } from "react-i18next";

/**
 * Shown while a lazily-loaded route chunk is downloading.
 *
 * Routes are code-split, so on a slow connection there is a real gap between
 * clicking a link and the page rendering. Deliberately minimal: this competes
 * for the same bandwidth as the chunk it is waiting for, and a visible spinner
 * that arrives instantly reads as faster than a blank screen that eventually
 * fills in.
 */
export function RouteFallback() {
  const { t } = useTranslation();

  return (
    <div
      className="flex min-h-[50vh] w-full items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
      </div>
    </div>
  );
}
