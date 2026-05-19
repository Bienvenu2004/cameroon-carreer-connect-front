import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A tag-input with autocomplete suggestions.
 *
 * The component is intentionally "dumb" — it doesn't fetch or filter
 * options itself. The parent owns `options` and updates it in reaction to
 * `onInputChange`. That way the same component handles:
 *
 *   - API-backed suggestions (skills: parent debounces and calls the
 *     backend `/api/hjp/skills/suggest` endpoint)
 *   - Static suggestions    (spoken languages: parent filters the
 *     hard-coded SPOKEN_LANGUAGES list)
 *
 * Interaction:
 *   - Type → `onInputChange` fires so the parent can refresh `options`.
 *   - Enter → if a suggestion is highlighted, add it; otherwise add the
 *     raw input text.
 *   - ↑ / ↓ → move the highlight in the dropdown.
 *   - Click a suggestion → adds it.
 *   - Backspace on empty input → removes the last selected tag.
 *   - × on a tag → removes that tag.
 *
 * Duplicates are filtered case-insensitively before being added.
 */
export interface TagAutocompleteProps {
  /** Currently selected tag values. */
  values: string[];
  /** Replaces the values array; parent re-renders with the new list. */
  onChange: (next: string[]) => void;
  /** Suggestion strings, already filtered & deduplicated by the parent. */
  options: string[];
  /** True while the parent is awaiting an async fetch (renders a spinner). */
  loading?: boolean;
  /** Called whenever the input text changes (so the parent can refilter). */
  onInputChange?: (value: string) => void;
  /** Placeholder for the underlying input. */
  placeholder?: string;
  /** Icon shown inside each selected-value badge (optional). */
  badgeIcon?: React.ComponentType<{ className?: string }>;
  /** className passthrough on the outer wrapper. */
  className?: string;
}

export function TagAutocomplete({
  values,
  onChange,
  options,
  loading = false,
  onInputChange,
  placeholder,
  badgeIcon: BadgeIcon,
  className,
}: TagAutocompleteProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const blurTimer = useRef<number | null>(null);

  // Hide already-selected items from the suggestion list so the user
  // can't add the same tag twice (case-insensitive compare).
  const remainingOptions = options.filter(
    (o) => !values.some((v) => v.toLowerCase() === o.toLowerCase())
  );

  // Reset highlight whenever the visible list changes — keeps it from
  // pointing past the end.
  useEffect(() => {
    setHighlight(0);
  }, [remainingOptions.length]);

  // Cleanup any pending blur-close on unmount.
  useEffect(() => () => {
    if (blurTimer.current !== null) window.clearTimeout(blurTimer.current);
  }, []);

  const addTag = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (values.some((v) => v.toLowerCase() === name.toLowerCase())) {
      // Silently drop dupes; just clear the input.
      setDraft("");
      onInputChange?.("");
      return;
    }
    onChange([...values, name]);
    setDraft("");
    onInputChange?.("");
    setOpen(false);
  };

  const removeAt = (i: number) => {
    onChange(values.filter((_, j) => j !== i));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && remainingOptions[highlight]) {
        addTag(remainingOptions[highlight]);
      } else {
        addTag(draft);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.min(remainingOptions.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      // Quick tag removal: backspace on an empty input pops the last tag.
      e.preventDefault();
      removeAt(values.length - 1);
    }
  };

  const dropdownVisible = open && (loading || remainingOptions.length > 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onInputChange?.(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Defer closing so a click on a suggestion still fires.
            if (blurTimer.current !== null) window.clearTimeout(blurTimer.current);
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={dropdownVisible}
          autoComplete="off"
        />
        {dropdownVisible && (
          <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
            {loading && remainingOptions.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("common.loading")}
              </div>
            ) : (
              <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
                {remainingOptions.map((opt, i) => (
                  <li key={opt} role="option" aria-selected={i === highlight}>
                    <button
                      type="button"
                      // onMouseDown prevents the input's onBlur from firing
                      // before our click handler does — otherwise the
                      // dropdown closes a tick too early.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addTag(opt)}
                      onMouseEnter={() => setHighlight(i)}
                      className={cn(
                        "block w-full px-3 py-2 text-left text-sm transition-colors",
                        i === highlight
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/60"
                      )}
                    >
                      {opt}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v, i) => (
            <Badge
              key={`${v}-${i}`}
              variant="secondary"
              className="gap-1"
            >
              {BadgeIcon && <BadgeIcon className="h-3 w-3" />} {v}
              <button
                type="button"
                className="rounded-full hover:bg-muted-foreground/20"
                onClick={() => removeAt(i)}
                aria-label={t("common.delete")}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
