import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Settings2, Zap } from "lucide-react";

import { CompaniesApi, JobsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";
import { ALL_REGIONS, type Region } from "@/types/api";

/**
 * Simplified "Quick post" job flow (§7.3 of the product spec: a simplified
 * posting flow for small businesses with limited HR infrastructure).
 *
 * Trims the full JobEditor down to the bare essentials — what, where, and how
 * much — and applies sensible defaults for everything else (full-time, on-site,
 * XAF). A small business owner can publish in under a minute; power users who
 * need benefits / work-site / language controls get a one-click link to the
 * full editor.
 *
 * The company requirement is unchanged (jobs belong to a verified company —
 * that's what keeps listings trustworthy), but we hide the picker entirely
 * when the recruiter has a single approved company and auto-select it.
 */
export function QuickJobPost() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { toast } = useToast();

  const companies = useQuery({
    queryKey: ["my-companies-for-job"],
    queryFn: () => CompaniesApi.mine(),
  });
  const approvedCompanies = useMemo(
    () => (companies.data ?? []).filter((c) => c.status === "APPROVED"),
    [companies.data],
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [salary, setSalary] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState<Region>("CENTRE");
  const [companyId, setCompanyId] = useState("");

  // Auto-select the first approved company. With just one (the common case for
  // a small business) the picker is hidden and this is the only selection made.
  useEffect(() => {
    if (!companyId && approvedCompanies[0]?.id) {
      setCompanyId(approvedCompanies[0].id);
    }
  }, [approvedCompanies, companyId]);

  const m = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      // Sensible defaults so the seeker-facing listing is still complete.
      fd.append("type", "FULL_TIME");
      fd.append("site", "ONSITE");
      fd.append("salaryCurrency", "XAF");
      if (salary) fd.append("salary", salary);
      if (companyId) fd.append("companyId", companyId);
      fd.append("location.city", city);
      fd.append("location.region", region);
      fd.append("location.stateRegion", region);
      fd.append("location.country", "Cameroon");
      return JobsApi.create(fd);
    },
    onSuccess: () => {
      toast({ title: t("common.successSaved"), variant: "success" });
      nav("/recruiter/jobs");
    },
    onError: (e) =>
      toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  const canSubmit = Boolean(title.trim() && description.trim() && companyId);

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Zap className="h-3.5 w-3.5" /> {t("quickPost.badge")}
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">
          {t("quickPost.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("quickPost.subtitle")}</p>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); m.mutate(); }}
        className="space-y-5 rounded-2xl border border-border/60 bg-card p-6 elev-1"
      >
        <p className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
          {t("quickPost.intro")}
        </p>

        <div className="space-y-2">
          <Label>{t("quickPost.jobTitle")}</Label>
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("quickPost.jobTitlePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("quickPost.details")}</Label>
          <Textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("quickPost.detailsPlaceholder")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("quickPost.city")}</Label>
            <Input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("quickPost.cityPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("quickPost.region")}</Label>
            <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{t(`regions.${r}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("quickPost.pay")}</Label>
            <Input
              type="number"
              min="0"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder={t("quickPost.payPlaceholder")}
            />
          </div>
        </div>

        {/* Company: hidden when there's exactly one approved company (auto-used);
            a picker when there are several; a blocking notice when there are none. */}
        {approvedCompanies.length === 0 ? (
          <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
            <div className="flex-1 space-y-2">
              <p className="text-foreground/85">{t("jobEditor.noApprovedCompanies")}</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/recruiter/companies">{t("jobEditor.manageCompanies")}</Link>
              </Button>
            </div>
          </div>
        ) : approvedCompanies.length > 1 ? (
          <div className="space-y-2">
            <Label>{t("quickPost.company")}</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder={t("jobEditor.companyPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {approvedCompanies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("quickPost.postingAs", { company: approvedCompanies[0]?.name ?? "" })}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/recruiter/jobs/new">
              <Settings2 className="h-4 w-4" /> {t("quickPost.advancedLink")}
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={m.isPending} disabled={!canSubmit}>
              {t("quickPost.publish")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
