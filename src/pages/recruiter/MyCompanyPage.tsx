import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, AlertCircle, XCircle } from "lucide-react";

import { CompaniesApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { CompanyStatusBadge } from "@/components/common/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import { ALL_INDUSTRIES, ALL_REGIONS, type Industry, type Region, type CompanySize } from "@/types/api";

const SIZES: CompanySize[] = ["MICRO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"];

export function MyCompanyPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();

  // Backend's /companies/me returns the company owned by the current
  // authenticated recruiter (createdBy = currentUser), or null if none.
  const mine = useQuery({ queryKey: ["my-recruiter-company"], queryFn: () => CompaniesApi.mine() });
  const company = mine.data;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState<Industry | "">("");
  const [size, setSize] = useState<CompanySize | "">("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState<Region | "">("");
  const [logo, setLogo] = useState<File | null>(null);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setDescription(company.description ?? "");
      setWebsite(company.website ?? "");
      setIndustry((company.industry as Industry) ?? "");
      setSize((company.size as CompanySize) ?? "");
      setCity(company.address?.city ?? "");
      setRegion((company.address?.region as Region) ?? "");
    }
  }, [company]);

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
      return company ? CompaniesApi.update(company.id, fd) : CompaniesApi.create(fd);
    },
    onSuccess: () => {
      toast({ title: t("common.successSaved"), variant: "success" });
      void qc.invalidateQueries({ queryKey: ["my-recruiter-company"] });
    },
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  return (
    <div className="max-w-3xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {company ? t("company.title") : t("company.createTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("company.verificationStatus")}</p>
        </div>
        {company?.status && <CompanyStatusBadge status={company.status} />}
      </header>

      {company?.status === "APPROVED" && (
        <Notice icon={BadgeCheck} tone="success">{t("company.verifiedNotice")}</Notice>
      )}
      {company?.status === "PENDING" && (
        <Notice icon={AlertCircle} tone="warning">{t("company.pendingNotice")}</Notice>
      )}
      {company?.status === "REJECTED" && (
        <Notice icon={XCircle} tone="destructive">{t("company.rejectedNotice", { reason: company.rejectionReason ?? "—" })}</Notice>
      )}
      {company?.status === "SUSPENDED" && (
        <Notice icon={XCircle} tone="destructive">{t("company.suspendedNotice", { reason: company.rejectionReason ?? "—" })}</Notice>
      )}

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="mt-6 space-y-5 rounded-2xl border border-border/60 bg-card p-6 elev-1">
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
                {ALL_INDUSTRIES.map((s) => <SelectItem key={s} value={s}>{t(`industries.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("profile.region")}</Label>
            <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {ALL_REGIONS.map((r) => <SelectItem key={r} value={r}>{t(`regions.${r}`)}</SelectItem>)}
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
        <div className="flex justify-end">
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
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${cls}`}>
      <Icon className={`mt-0.5 h-5 w-5 ${tone === "success" ? "text-success" : tone === "warning" ? "text-warning-foreground" : "text-destructive"}`} />
      <div className="text-sm">{children}</div>
    </div>
  );
}
