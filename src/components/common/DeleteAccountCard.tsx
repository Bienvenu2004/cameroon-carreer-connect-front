import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

import { UserApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { useAuthStore } from "@/stores/auth";
import { apiErrorMessage } from "@/lib/api";

/**
 * Lets the signed-in user delete their own account, for example to register the
 * same email again with the other role. Deletion is confirmed with the password,
 * or, for Google accounts that have none, by typing the email address.
 */
export function DeleteAccountCard() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState("");

  // /me carries the sign-in method; the session cookie is too small to hold it.
  const me = useQuery({ queryKey: ["me"], queryFn: () => UserApi.me(), enabled: open });
  const isGoogle = me.data?.authProvider === "GOOGLE";
  const email = me.data?.email ?? "";
  const ready = me.isSuccess && (isGoogle ? secret.trim().toLowerCase() === email.toLowerCase() : secret.length > 0);

  const remove = useMutation({
    mutationFn: () => UserApi.deleteMe(isGoogle ? { confirmEmail: secret.trim() } : { password: secret }),
    onSuccess: () => {
      logout();
      queryClient.clear();
      toast({ title: t("account.deleted"), description: t("account.deletedHint") });
      nav("/register", { replace: true });
    },
    onError: (e) => toast({ title: t("account.deleteFailed"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setSecret("");
  };

  return (
    <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="font-display text-lg font-semibold text-destructive">{t("account.deleteTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("account.deleteIntro")}</p>
      <Button variant="destructive" className="mt-4" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> {t("account.deleteButton")}
      </Button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("account.confirmTitle")}</DialogTitle>
            <DialogDescription>{t("account.confirmBody")}</DialogDescription>
          </DialogHeader>

          {me.isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          {me.isError && <p className="text-sm text-destructive">{t("common.errorOccurred")}</p>}
          {me.isSuccess && (
            <form
              id="delete-account-form"
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (ready && !remove.isPending) remove.mutate();
              }}
            >
              {isGoogle ? (
                <>
                  <Label htmlFor="delete-confirm-email">{t("account.confirmEmailLabel", { email })}</Label>
                  <Input
                    id="delete-confirm-email"
                    type="email"
                    autoComplete="off"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder={email}
                  />
                </>
              ) : (
                <>
                  <Label htmlFor="delete-confirm-password">{t("account.confirmPasswordLabel")}</Label>
                  <PasswordInput
                    id="delete-confirm-password"
                    autoComplete="current-password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                  />
                </>
              )}
            </form>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>{t("common.cancel")}</Button>
            <Button type="submit" form="delete-account-form" variant="destructive" disabled={!ready} loading={remove.isPending}>
              {t("account.confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
