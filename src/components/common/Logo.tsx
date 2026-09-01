import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * The JobsConnect CMR brand lockup.
 *
 * Two things about the artwork drive this component.
 *
 * It is a *lockup*: the mark and the wordmark are one image, so nothing renders
 * the brand name as text beside it — that would print the name twice. The name
 * lives in the `alt` attribute instead, which is where a screen reader and an
 * image-blocked browser will look for it.
 *
 * It is a single solid emerald on transparency, which means the light version
 * is `brightness(0) invert(1)` rather than a second file. That keeps one request
 * instead of two on pages that could render either — and on a metered connection
 * a second logo download is a second logo download. If the artwork ever becomes
 * multi-colour this stops working and a real light asset has to replace it.
 */
export function Logo({
  className,
  mark = false,
  light = false,
  imgClassName,
}: {
  className?: string;
  /** Render just the "j" glyph, for tight spaces. */
  mark?: boolean;
  /** Force the white treatment, for backgrounds that are dark in every theme. */
  light?: boolean;
  imgClassName?: string;
}) {
  const { t } = useTranslation();
  const src = mark ? "/logo/logo-mark.png" : "/logo/logo-full.png";

  return (
    <Link
      to="/"
      className={cn("inline-flex items-center", className)}
      aria-label={t("brand.name")}
    >
      <img
        src={src}
        alt={t("brand.name")}
        // Intrinsic size prevents the header from reflowing as the image lands,
        // which on a slow connection is the difference between a page that
        // settles and one that jumps under the reader's cursor.
        width={mark ? 255 : 800}
        height={mark ? 288 : 216}
        // Eager and high priority: this is above the fold on every page, and
        // lazy-loading the thing that tells someone which site they are on is
        // the wrong trade.
        loading="eager"
        decoding="async"
        className={cn(
          mark ? "h-9 w-auto" : "h-9 w-auto",
          light ? "brightness-0 invert" : "dark:brightness-0 dark:invert",
          imgClassName,
        )}
      />
    </Link>
  );
}
