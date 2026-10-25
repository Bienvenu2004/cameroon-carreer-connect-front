import { useLayoutEffect, useRef, useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { AuthApi, UserApi } from "@/api";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";
import { isGoogleAuthEnabled, useGsiStatus } from "@/lib/googleAuth";
import type { UserRole } from "@/types/api";

interface GoogleAuthButtonProps {
  /**
   * Role to assign when Google Sign-In creates a brand-new account. Only used
   * on first sign-up (the register screen); ignored for existing accounts.
   */
  role?: UserRole;
  /** Where to go after a successful sign-in. Defaults to the role dashboard. */
  redirect?: string | null;
  /** Google button label variant. */
  text?: "signin_with" | "signup_with" | "continue_with";
}

/**
 * Renders Google's official sign-in button and completes the app session on
 * success: it posts the Google credential (+ optional role) to the backend,
 * stores the returned user, and navigates to the right dashboard.
 *
 * Always occupies its slot: while Google's script loads it shows a pulsing
 * stand-in of the same size, and if the script cannot load, or the build has no
 * client id, it shows that stand-in disabled with the reason underneath. The
 * button used to render nothing in those cases, so it simply vanished.
 */
export function GoogleAuthButton({ role, redirect, text = "continue_with" }: GoogleAuthButtonProps) {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const setSession = useAuthStore((s) => s.loginSession);
  const { toast } = useToast();
  const gsiStatus = useGsiStatus((s) => s.status);
  const status = isGoogleAuthEnabled() ? gsiStatus : "unconfigured";

  const slotRef = useRef<HTMLDivElement>(null);
  const [slotWidth, setSlotWidth] = useState(0);
  useLayoutEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const measure = () => setSlotWidth(Math.floor(el.clientWidth));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  async function handleSuccess(cred: CredentialResponse) {
    if (!cred.credential) {
      toast({ title: t("auth.googleFailed"), variant: "destructive" });
      return;
    }
    try {
      const auth = await AuthApi.google({ credential: cred.credential, role });
      const me = auth.user ?? (await UserApi.me());
      setSession({ accessToken: auth.accessToken, refreshToken: auth.refreshToken, user: me });

      const dest =
        redirect ??
        (me.role === "SYSTEM_ADMIN"
          ? "/admin"
          : me.role === "RECRUITER"
            ? "/recruiter"
            : "/seeker");
      nav(dest, { replace: true });
    } catch (e) {
      toast({
        title: t("errors.loginFailed"),
        description: apiErrorMessage(e),
        variant: "destructive",
      });
    }
  }

  // Google renders its button once into an iframe and never re-localizes it,
  // so we pass a clean 2-letter locale and key the component on it: when the
  // language changes (or i18n settles after its async init), React remounts
  // the button and Google re-renders it in the right language.
  const locale = i18n.language.split("-")[0];

  // Google's button only accepts a pixel width between 200 and 400. A fixed
  // 360 overflowed the auth card on narrow phones, so it follows the slot.
  const buttonWidth = String(Math.max(200, Math.min(400, slotWidth || 360)));

  return (
    <div ref={slotRef} className="flex min-h-10 w-full flex-col items-center justify-center gap-2">
      {status === "ready" ? (
        <GoogleLogin
          key={`${locale}-${buttonWidth}`}
          onSuccess={handleSuccess}
          onError={() => toast({ title: t("auth.googleFailed"), variant: "destructive" })}
          text={text}
          locale={locale}
          width={buttonWidth}
        />
      ) : (
        <GoogleFallbackButton loading={status === "loading"} />
      )}
      {status === "failed" && (
        <p className="text-center text-xs text-muted-foreground">
          {t("auth.googleLoadFailed")}{" "}
          <button type="button" onClick={() => window.location.reload()} className="font-medium text-primary hover:underline">
            {t("common.tryAgain")}
          </button>
        </p>
      )}
      {status === "unconfigured" && (
        <p className="text-center text-xs text-muted-foreground">{t("auth.googleUnavailable")}</p>
      )}
    </div>
  );
}

/**
 * Stand-in drawn in Google's own outline style, the same height as the real
 * button, so the auth card never reflows and the option is always visibly
 * there: pulsing while Google's script loads, disabled when it cannot.
 */
function GoogleFallbackButton({ loading }: { loading: boolean }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      disabled
      aria-busy={loading}
      className={`flex h-10 w-full max-w-[400px] items-center justify-center gap-3 rounded border border-[#dadce0] bg-white px-3 text-sm font-medium text-[#3c4043] disabled:cursor-not-allowed ${loading ? "animate-pulse" : "opacity-60"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" className="h-[18px] w-[18px]">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      {t("auth.continueWithGoogle")}
    </button>
  );
}
