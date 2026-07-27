import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Briefcase, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { AuthApi } from "@/api";
import { apiErrorMessage } from "@/lib/api";
import type { UserRole } from "@/types/api";
import { cn } from "@/lib/utils";
import { GoogleAuthButton } from "@/components/common/GoogleAuthButton";
import { isGoogleAuthEnabled } from "@/lib/googleAuth";
import { AuthShell } from "./AuthShell";

/**
 * Step 1 of signup. Collects email + password + role and triggers an
 * email-verification code. Credentials are forwarded to /verify-email
 * via router state so we can complete the actual /register call once
 * the email has been verified.
 */
export function RegisterPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const initialRole = (params.get("role") as UserRole) ?? "JOB_SEEKER";
  const [role, setRole] = useState<UserRole>(initialRole === "RECRUITER" ? "RECRUITER" : "JOB_SEEKER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { toast } = useToast();

  const m = useMutation({
    mutationFn: async () => {
      if (password !== confirm) throw new Error(t("errors.passwordsDoNotMatch"));
      // Step 1 — ask backend to send the 6-digit verification code.
      await AuthApi.requestEmailVerification(email);
    },
    onSuccess: () => {
      toast({
        title: t("auth.verifyEmailTitle"),
        description: t("auth.verifyEmailSub"),
        variant: "success",
      });
      // Forward credentials to the verify page so the actual /register call
      // can be made once the email is confirmed.
      nav(`/verify-email?email=${encodeURIComponent(email)}`, {
        state: { email, password, role, mode: "register" },
      });
    },
    onError: (e) => toast({
      title: t("errors.registerFailed"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("auth.registerTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("auth.registerSubtitle")}</p>

      <div className="mt-6">
        <Label className="mb-2 block">{t("auth.iAmA")}</Label>
        <div className="grid grid-cols-2 gap-3">
          <RoleCard active={role === "JOB_SEEKER"} icon={User} label={t("auth.jobSeeker")} onClick={() => setRole("JOB_SEEKER")} />
          <RoleCard active={role === "RECRUITER"} icon={Briefcase} label={t("auth.recruiter")} onClick={() => setRole("RECRUITER")} />
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <PasswordInput id="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">{t("auth.passwordMin")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
          <PasswordInput id="confirm" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" size="lg" loading={m.isPending}>{t("auth.signUp")}</Button>
      </form>

      {isGoogleAuthEnabled() && (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.orContinueWith")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          {/* The role selected above is applied when Google creates the account. */}
          <GoogleAuthButton role={role} text="signup_with" />
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.haveAccount")} <Link to="/login" className="font-medium text-primary hover:underline">{t("auth.signIn")}</Link>
      </p>
    </AuthShell>
  );
}

function RoleCard({ active, icon: Icon, label, onClick }: {
  active: boolean; icon: typeof User; label: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
        active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border bg-card hover:border-primary/40"
      )}
    >
      <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
