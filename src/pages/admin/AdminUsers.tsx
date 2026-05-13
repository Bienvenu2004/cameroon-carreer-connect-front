import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldOff, ShieldCheck } from "lucide-react";

import { AdminApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/common/Pagination";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";
import type { UserRole } from "@/types/api";
import { relativeTime } from "@/lib/utils";

type ActiveFilter = "ALL" | "ACTIVE" | "SUSPENDED";

export function AdminUsers() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "ALL">("ALL");
  const [active, setActive] = useState<ActiveFilter>("ALL");
  const [page, setPage] = useState(0);

  // Reset to first page when any filter changes so we don't land beyond the
  // last page of the new result set.
  useEffect(() => { setPage(0); }, [search, role, active]);

  const filter = {
    page,
    size: 20,
    sortBy: "createdAt",
    sortOrder: "DESC" as const,
    search: search || undefined,
    role: role === "ALL" ? undefined : role,
    active: active === "ALL" ? undefined : active === "ACTIVE",
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", filter],
    queryFn: () => AdminApi.listUsers(filter),
  });

  const suspend = useMutation({
    mutationFn: (id: string) => AdminApi.suspendUser(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-users"] }); toast({ title: t("common.successSaved"), variant: "success" }); },
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });
  const reactivate = useMutation({
    mutationFn: (id: string) => AdminApi.reactivateUser(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-users"] }); toast({ title: t("common.successSaved"), variant: "success" }); },
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("admin.users")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </header>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.search")} className="pl-9" />
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as UserRole | "ALL")}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("jobs.all")}</SelectItem>
            <SelectItem value="JOB_SEEKER">{t("auth.jobSeeker")}</SelectItem>
            <SelectItem value="RECRUITER">{t("auth.recruiter")}</SelectItem>
            <SelectItem value="SYSTEM_ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={active} onValueChange={(v) => setActive(v as ActiveFilter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("jobs.all")}</SelectItem>
            <SelectItem value="ACTIVE">{t("admin.userActive")}</SelectItem>
            <SelectItem value="SUSPENDED">{t("admin.userSuspended")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card elev-1">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 text-left font-medium">{t("auth.email")}</th>
              <th className="p-4 text-left font-medium">{t("auth.iAmA")}</th>
              <th className="p-4 text-left font-medium">{t("admin.userActive")}</th>
              <th className="p-4 text-left font-medium">{t("admin.lastLogin")}</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {data?.content.map((u) => (
              <tr key={u.id} className="border-b border-border/40 last:border-0 hover:bg-accent/30">
                <td className="p-4">
                  <div className="font-medium">{u.email}</div>
                  {u.displayName && <div className="text-xs text-muted-foreground">{u.displayName}</div>}
                </td>
                <td className="p-4">{u.role === "JOB_SEEKER" ? t("auth.jobSeeker") : u.role === "RECRUITER" ? t("auth.recruiter") : "Admin"}</td>
                <td className="p-4">
                  {u.active ? <Badge variant="success">{t("admin.userActive")}</Badge> : <Badge variant="destructive">{t("admin.userSuspended")}</Badge>}
                </td>
                <td className="p-4 text-xs text-muted-foreground">{relativeTime(u.lastLogin ?? u.registrationDate, locale)}</td>
                <td className="p-4 text-right">
                  {u.active ? (
                    <Button size="sm" variant="ghost" loading={suspend.isPending && suspend.variables === u.id} onClick={() => suspend.mutate(u.id)}>
                      <ShieldOff className="h-4 w-4" /> {t("admin.suspendUser")}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" loading={reactivate.isPending && reactivate.variables === u.id} onClick={() => reactivate.mutate(u.id)}>
                      <ShieldCheck className="h-4 w-4" /> {t("admin.reactivateUser")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {data?.content.length === 0 && (
              <tr><td className="p-8 text-center text-muted-foreground" colSpan={5}>{t("common.noResults")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination
          page={data.pageNumber}
          totalPages={data.totalPages}
          isLast={data.isLast}
          totalElements={data.totalElements}
          onChange={setPage}
        />
      )}
    </div>
  );
}
