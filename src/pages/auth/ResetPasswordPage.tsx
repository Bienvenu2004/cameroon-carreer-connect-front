import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { AuthApi } from "@/api";
import { apiErrorMessage } from "@/lib/api";
import { AuthShell } from "./AuthShell";

/**
 * Combined verify + reset page for the password-reset flow.
 *
 * The user lands here after /forgot-password sent them an OTP. They enter the
 * code along with their new password, and we run:
 *   1. /verify-email (verificationType = PASSWORD_RESET)
 *   2. /reset-password
 * before redirecting them to /login.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email;
  const email = stateEmail ?? params.get("email") ?? "";

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { toast } = useToast();
  const nav = useNavigate();

  const m = useMutation({
    mutationFn: async () => {
      if (password !== confirm) throw new Error(t("errors.passwordsDoNotMatch"));
      // 1. Verify the OTP (PASSWORD_RESET flow).
      await AuthApi.verifyEmail({
        email,
        verificationCode: code,
        verificationType: "PASSWORD_RESET",
      });
      // 2. Actually change the password.
      await AuthApi.resetPassword({
        email,
        newPassword: password,
        confirmNewPassword: confirm,
      });
    },
    onSuccess: () => {
      toast({ title: t("common.successSaved"), variant: "success" });
      nav("/login", { replace: true });
    },
    onError: (e) => toast({
      title: t("common.errorOccurred"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  const resend = useMutation({
    mutationFn: () => AuthApi.resendVerification(email, "PASSWORD_RESET"),
    onSuccess: () => toast({ title: t("auth.resendCode"), variant: "success" }),
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("auth.resetPasswordTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("auth.verifyEmailSub")}</p>
      {email && <p className="mt-2 text-sm font-medium text-foreground/80 break-words">{email}</p>}

      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="mt-6 space-y-4">
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
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.newPassword")}</Label>
          <Input id="password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">{t("auth.passwordMin")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
          <Input id="confirm" type="password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" size="lg" loading={m.isPending}>{t("common.submit")}</Button>
        <Button type="button" variant="ghost" className="w-full" loading={resend.isPending} onClick={() => resend.mutate()}>
          {t("auth.resendCode")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">{t("auth.signIn")}</Link>
      </p>
    </AuthShell>
  );
}
