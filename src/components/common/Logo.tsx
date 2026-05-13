import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2 font-display font-bold tracking-tight", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden="true">
          <path
            d="M14 40 L20 22 L26 38 L32 18 L38 38 L44 22 L50 40"
            fill="none"
            stroke="hsl(var(--gold))"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="48" r="3" fill="hsl(var(--gold))" />
        </svg>
      </span>
      {!mark && <span className="text-base text-foreground">{t("brand.name")}</span>}
    </Link>
  );
}
