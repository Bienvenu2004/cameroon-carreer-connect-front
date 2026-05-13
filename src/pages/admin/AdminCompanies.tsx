import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Search, XCircle, Pause } from "lucide-react";

import { AdminApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanyStatusBadge } from "@/components/common/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Pagination } from "@/components/common/Pagination";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";
import type { CompanyStatus } from "@/types/api";

export function AdminCompanies() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<CompanyStatus | "ALL">("PENDING");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);

  // Reset to first page when either filter changes.
  useEffect(() => { setPage(0); }, [status, keyword]);

  const filter = {
    page,
    size: 20,
    sortBy: "createdAt",
    sortOrder: "DESC" as const,
    status: status === "ALL" ? undefined : status,
    name: keyword || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-companies", filter],
    queryFn: () => AdminApi.listCompanies(filter),
  });

  const approve = useMutation({
    mutationFn: (id: string) => AdminApi.approveCompany(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-companies"] }); toast({ title: t("common.successSaved"), variant: "success" }); },
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  const [decisionDialog, setDecisionDialog] = useState<{ id: string; action: "reject" | "suspend"; reason: string } | null>(null);
  const decide = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: "reject" | "suspend"; reason: string }) =>
      action === "reject" ? AdminApi.rejectCompany(id, reason) : AdminApi.suspendCompany(id, reason),
    onSuccess: () => {
      setDecisionDialog(null);
      void qc.invalidateQueries({ queryKey: ["admin-companies"] });
      toast({ title: t("common.successSaved"), variant: "success" });
    },
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("admin.companies")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </header>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("common.search")}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as CompanyStatus | "ALL")}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("jobs.all")}</SelectItem>
            <SelectItem value="PENDING">{t("company.statuses.PENDING")}</SelectItem>
            <SelectItem value="APPROVED">{t("company.statuses.APPROVED")}</SelectItem>
            <SelectItem value="REJECTED">{t("company.statuses.REJECTED")}</SelectItem>
            <SelectItem value="SUSPENDED">{t("company.statuses.SUSPENDED")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

      <div className="space-y-3">
        {data?.content.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4 elev-1">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base font-semibold">{c.name}</h3>
                {c.status && <CompanyStatusBadge status={c.status} />}
                {c.industry && <span className="text-xs text-muted-foreground">{t(`industries.${c.industry}`)}</span>}
              </div>
              {c.description && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{c.description}</p>}
              {c.rejectionReason && <p className="mt-1 text-xs text-destructive">« {c.rejectionReason} »</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {c.status !== "APPROVED" && (
                <Button size="sm" variant="ghost" loading={approve.isPending && approve.variables === c.id} onClick={() => approve.mutate(c.id)}>
                  <CheckCircle2 className="h-4 w-4 text-success" /> {t("admin.approve")}
                </Button>
              )}
              {c.status === "PENDING" && (
                <Button size="sm" variant="ghost" onClick={() => setDecisionDialog({ id: c.id, action: "reject", reason: "" })}>
                  <XCircle className="h-4 w-4 text-destructive" /> {t("admin.reject")}
                </Button>
              )}
              {c.status === "APPROVED" && (
                <Button size="sm" variant="ghost" onClick={() => setDecisionDialog({ id: c.id, action: "suspend", reason: "" })}>
                  <Pause className="h-4 w-4 text-warning-foreground" /> {t("admin.suspend")}
                </Button>
              )}
            </div>
          </div>
        ))}
        {data?.content.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
            {t("common.noResults")}
          </div>
        )}
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

      <Dialog open={!!decisionDialog} onOpenChange={(o) => !o && setDecisionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionDialog?.action === "reject" ? t("admin.reject") : t("admin.suspend")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("admin.reasonPrompt")}</Label>
            <Textarea
              rows={4}
              value={decisionDialog?.reason ?? ""}
              onChange={(e) => decisionDialog && setDecisionDialog({ ...decisionDialog, reason: e.target.value })}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">{t("common.cancel")}</Button>
            </DialogClose>
            <Button
              disabled={!decisionDialog?.reason}
              loading={decide.isPending}
              onClick={() => decisionDialog && decide.mutate(decisionDialog)}
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
