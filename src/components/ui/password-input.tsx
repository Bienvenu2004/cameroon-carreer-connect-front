import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password field with a show/hide toggle.
 *
 * Drop-in replacement for <Input type="password"> — forwards every native
 * input prop and the ref. Owns a local "revealed" flag that flips the input
 * between password and text. The eye button is padding-reserved (pr-10) so it
 * never overlaps the typed value, is `tabIndex={-1}` so it doesn't interrupt
 * tab-through to the submit button, and carries an aria-label for a11y.
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => {
  const { t } = useTranslation();
  const [revealed, setRevealed] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={revealed ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setRevealed((v) => !v)}
        aria-label={revealed ? t("common.hidePassword") : t("common.showPassword")}
        aria-pressed={revealed}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground disabled:opacity-50"
        disabled={props.disabled}
      >
        {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
