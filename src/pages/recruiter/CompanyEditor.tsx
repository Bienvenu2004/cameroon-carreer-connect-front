import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, BadgeCheck, XCircle } from "lucide-react";

import { CompaniesApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { CompanyStatusBadge } from "@/components/common/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import {
  ALL_INDUSTRIES, ALL_REGIONS,
  type CompanySize, type Industry, type Region,
} from "@/types/api";

const SIZES: CompanySize[] = ["MICRO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"];

/**
 * Single component that handles both creating a new company and editing
 * an existing one. The mode is determined by the route — if `:id` is in
 * the URL we're editing; otherwise we're creating.
 */
export function CompanyEditor({ mode }: { mode: "create" | "edit" }) {
  const { t } = useTranslation();
  const { id } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const nav = useNavigate();

  // Only fetch when editing.
  const existing = useQuery({
    queryKey: ["company-edit", id],
    queryFn: () => CompaniesApi.get(id!),
    enabled: mode === "edit" && !!id,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState<Industry | "">("");
  const [size, setSize] = useState<CompanySize | "">("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState<Region | "">("");
  const [logo, setLogo] = useState<File | null>(null);

  // Hydrate form once data loads (edit mode only).
  useEffect(() => {
    const c = existing.data;
    if (!c) return;
    setName(c.name);
    setDescription(c.description ?? "");
    setWebsite(c.website ?? "");
    setIndustry((c.industry as Industry) ?? "");
    setSize((c.size as CompanySize) ?? "");
    setCity(c.address?.city ?? "");
    setRegion((c.address?.region as Region) ?? "");
  }, [existing.data]);

  const save = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      fd.append("website", website);
      if (industry) fd.append("industry", industry);
      if (size) fd.append("size", size);
      fd.append("address.city", city);
      if (region) fd.append("address.region", region);
      fd.append("address.country", "Cameroon");
      if (logo) fd.append("logo", logo);
      return mode === "edit" && id ? CompaniesApi.update(id, fd) : CompaniesApi.create(fd);
    },
    onSuccess: () => {
      toast({ title: t("common.successSaved"), variant: "success" });
      void qc.invalidateQueries({ queryKey: ["my-recruiter-companies"] });
      void qc.invalidateQueries({ queryKey: ["company-edit", id] });
      nav("/recruiter/companies");
    },
    onError: (e) => toast({
      title: t("common.errorOccurred"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  const c = existing.data;

  return (
    <div className="max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/recruiter/companies">
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("common.back")}
        </Link>
      </Button>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {mode === "create" ? t("company.createNew") : t("company.title")}
          </h1>
          {mode === "edit" && (
            <p className="mt-1 text-sm text-muted-foreground">{t("company.verificationStatus")}</p>
          )}
        </div>
        {c?.status && <CompanyStatusBadge status={c.status} />}
      </header>

      {mode === "edit" && c?.status === "APPROVED" && (
        <Notice icon={BadgeCheck} tone="success">{t("company.verifiedNotice")}</Notice>
      )}
      {mode === "edit" && c?.status === "PENDING" && (
        <Notice icon={AlertCircle} tone="warning">{t("company.pendingNotice")}</Notice>
      )}
      {mode === "edit" && c?.status === "REJECTED" && (
        <Notice icon={XCircle} tone="destructive">
          {t("company.rejectedNotice", { reason: c.rejectionReason ?? "—" })}
        </Notice>
      )}
      {mode === "edit" && c?.status === "SUSPENDED" && (
        <Notice icon={XCircle} tone="destructive">
          {t("company.suspendedNotice", { reason: c.rejectionReason ?? "—" })}
        </Notice>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        className="mt-6 space-y-5 rounded-2xl border border-border/60 bg-card p-6 elev-1"
      >
        <div className="space-y-2">
          <Label>{t("company.name")}</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("company.description")}</Label>
          <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("company.website")}</Label>
            <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("company.size")}</Label>
            <Select value={size} onValueChange={(v) => setSize(v as CompanySize)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("company.industry")}</Label>
            <Select value={industry} onValueChange={(v) => setIndustry(v as Industry)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {ALL_INDUSTRIES.map((s) => (
                  <SelectItem key={s} value={s}>{t(`industries.${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("profile.region")}</Label>
            <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {ALL_REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{t(`regions.${r}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("profile.city")}</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("company.uploadLogo")}</Label>
          <Input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => nav("/recruiter/companies")}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={save.isPending}>{t("common.save")}</Button>
        </div>
      </form>
    </div>
  );
}

function Notice({ icon: Icon, tone, children }: {
  icon: typeof BadgeCheck;
  tone: "success" | "warning" | "destructive";
  children: React.ReactNode;
}) {
  const cls = {
    success: "border-success/30 bg-success/5 text-foreground",
    warning: "border-warning/30 bg-warning/5 text-foreground",
    destructive: "border-destructive/30 bg-destructive/5 text-foreground",
  }[tone];
  const iconCls = {
    success: "text-success",
    warning: "text-warning-foreground",
    destructive: "text-destructive",
  }[tone];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${cls}`}>
      <Icon className={`mt-0.5 h-5 w-5 ${iconCls}`} />
      <div className="text-sm">{children}</div>
    </div>
  );
}
