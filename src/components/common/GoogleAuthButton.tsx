import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { AuthApi, UserApi } from "@/api";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";
import { isGoogleAuthEnabled } from "@/lib/googleAuth";
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
 * Renders nothing when Google Sign-In isn't configured for this build, so it
 * is always safe to drop into an auth page.
 */
export function GoogleAuthButton({ role, redirect, text = "continue_with" }: GoogleAuthButtonProps) {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const setSession = useAuthStore((s) => s.loginSession);
  const { toast } = useToast();

  if (!isGoogleAuthEnabled()) return null;

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

  return (
    <div className="flex w-full justify-center">
      <GoogleLogin
        key={locale}
        onSuccess={handleSuccess}
        onError={() => toast({ title: t("auth.googleFailed"), variant: "destructive" })}
        text={text}
        locale={locale}
        width="360"
      />
    </div>
  );
}
