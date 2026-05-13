import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { AuthApi } from "@/api";
import { apiErrorMessage } from "@/lib/api";
import { AuthShell } from "./AuthShell";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const nav = useNavigate();

  const m = useMutation({
    mutationFn: () => AuthApi.forgotPassword(email),
    onSuccess: () => {
      toast({
        title: t("auth.verifyEmailTitle"),
        description: t("auth.verifyEmailSub"),
        variant: "success",
      });
      // Hand off to the reset page where the user enters the OTP +
      // their new password. We pass the email both in the query string
      // (for refresh-survival) and via router state.
      nav(`/reset-password?email=${encodeURIComponent(email)}`, {
        state: { email },
      });
    },
    onError: (e) => toast({
      title: t("common.errorOccurred"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-bold tracking-tight">{t("auth.forgotPasswordTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("auth.forgotPasswordSub")}</p>

      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" size="lg" loading={m.isPending}>{t("common.submit")}</Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">{t("auth.signIn")}</Link>
      </p>
    </AuthShell>
  );
}
