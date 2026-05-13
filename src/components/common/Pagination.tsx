import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/**
 * Compact pagination control matching the backend's PageResponseDto shape:
 *   { pageNumber, totalPages, isLast, totalElements, ... }
 *
 * Hidden entirely when there's only a single page so the listing pages stay
 * clean. Page numbers are 0-indexed on the wire; we show them 1-indexed.
 */
export interface PaginationProps {
  /** Zero-indexed current page. */
  page: number;
  totalPages: number;
  isLast: boolean;
  /** Optional, for the "X total" hint on the right. */
  totalElements?: number;
  onChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  isLast,
  totalElements,
  onChange,
}: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={page === 0}
        onClick={() => onChange(Math.max(0, page - 1))}
      >
        {t("common.previous")}
      </Button>
      <span className="text-sm text-muted-foreground">
        {page + 1} / {totalPages}
        {typeof totalElements === "number" && (
          <span className="ml-2 text-xs">({totalElements})</span>
        )}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={isLast}
        onClick={() => onChange(page + 1)}
      >
        {t("common.next")}
      </Button>
    </div>
  );
}
