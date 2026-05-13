import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { AuthApi, UserApi } from "@/api";
import { useAuthStore } from "@/stores/auth";
import { apiErrorMessage } from "@/lib/api";
import { AuthShell } from "./AuthShell";
import type { UserRole } from "@/types/api";

interface RegisterState {
  email: string;
  password: string;
  role: UserRole;
  mode: "register";
}

/**
 * Email verification step. Two scenarios:
 *
 *   1. Register flow (router state contains email + password + role):
 *      verify-email → register → auto-login → redirect to dashboard.
 *
 *   2. Standalone verification (no state, just ?email= in URL):
 *      verify-email → redirect to /login.
 */
export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const location = useLocation();
  const state = (location.state as RegisterState | null) ?? null;
  const email = state?.email ?? params.get("email") ?? "";
  const isRegisterFlow = state?.mode === "register";

  const [code, setCode] = useState("");
  const { toast } = useToast();
  const nav = useNavigate();
  const setSession = useAuthStore((s) => s.loginSession);

  const verify = useMutation({
    mutationFn: async () => {
      // 1. Mark the email as verified for the EMAIL_REGISTRATION flow.
      await AuthApi.verifyEmail({
        email,
        verificationCode: code,
        verificationType: "EMAIL_REGISTRATION",
      });

      // 2. If we have credentials in router state, complete the signup
      //    and auto-login immediately for a smooth UX.
      if (isRegisterFlow && state) {
        await AuthApi.register({
          email: state.email,
          password: state.password,
          role: state.role,
        });
        const auth = await AuthApi.login({
          email: state.email,
          password: state.password,
        });
        const me = auth.user ?? (await UserApi.me());
        setSession({
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          user: me,
        });
        return me;
      }
      return null;
    },
    onSuccess: (me) => {
      toast({ title: t("common.successSaved"), variant: "success" });
      if (me) {
        const dest =
          me.role === "SYSTEM_ADMIN" ? "/admin"
          : me.role === "RECRUITER" ? "/recruiter"
          : "/seeker";
        nav(dest, { replace: true });
      } else {
        nav("/login", { replace: true });
      }
    },
    onError: (e) => toast({
      title: t("common.errorOccurred"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  const resend = useMutation({
    mutationFn: () => AuthApi.resendVerification(email),
    onSuccess: () => toast({ title: t("auth.resendCode"), variant: "success" }),
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("auth.verifyEmailTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("auth.verifyEmailSub")}</p>
      <p className="mt-2 text-sm font-medium text-foreground/80 break-words">{email}</p>

      <form onSubmit={(e) => { e.preventDefault(); verify.mutate(); }} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">{t("auth.code")}</Label>
          <Input
            id="code"
            required
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="text-center font-mono text-lg tracking-widest"
            autoComplete="one-time-code"
            inputMode="numeric"
          />
        </div>
        <Button type="submit" className="w-full" size="lg" loading={verify.isPending}>
          {t("common.submit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          loading={resend.isPending}
          onClick={() => resend.mutate()}
        >
          {t("auth.resendCode")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">{t("auth.signIn")}</Link>
      </p>
    </AuthShell>
  );
}
