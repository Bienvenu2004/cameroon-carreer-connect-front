import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { AuthApi, UserApi } from "@/api";
import { useAuthStore } from "@/stores/auth";
import { apiErrorMessage } from "@/lib/api";
import { GoogleAuthButton } from "@/components/common/GoogleAuthButton";
import { isGoogleAuthEnabled } from "@/lib/googleAuth";
import { AuthShell } from "./AuthShell";

export function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect");
  const setSession = useAuthStore((s) => s.loginSession);
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const m = useMutation({
    mutationFn: async () => {
      const auth = await AuthApi.login({ email, password });
      const me = auth.user ?? (await UserApi.me());
      setSession({ accessToken: auth.accessToken, refreshToken: auth.refreshToken, user: me });
      return me;
    },
    onSuccess: (user) => {
      const dest = redirect ??
        (user.role === "SYSTEM_ADMIN" ? "/admin"
          : user.role === "RECRUITER" ? "/recruiter"
          : "/seeker");
      nav(dest, { replace: true });
    },
    onError: (e) => toast({
      title: t("errors.loginFailed"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("auth.loginTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("auth.loginSubtitle")}</p>

      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">{t("auth.forgotPassword")}</Link>
          </div>
          <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <Button type="submit" className="w-full" size="lg" loading={m.isPending}>{t("auth.signIn")}</Button>
      </form>

      {isGoogleAuthEnabled() && (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.orContinueWith")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleAuthButton redirect={redirect} text="signin_with" />
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.noAccount")} <Link to="/register" className="font-medium text-primary hover:underline">{t("auth.signUp")}</Link>
      </p>
    </AuthShell>
  );
}
