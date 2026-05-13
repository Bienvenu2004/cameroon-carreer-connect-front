import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { CompaniesApi, JobsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";
import {
  ALL_JOB_SITES, ALL_JOB_TYPES, ALL_REGIONS,
  type JobSite, type JobType, type Region,
} from "@/types/api";

export function JobEditor({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const { toast } = useToast();

  // Recruiter's own companies — used to populate the company picker for the
  // job. CompaniesApi.mine() returns an array (not a page) of companies the
  // current recruiter owns, regardless of approval status.
  const companies = useQuery({
    queryKey: ["my-companies-for-job"],
    queryFn: () => CompaniesApi.mine(),
  });

  const existing = useQuery({
    queryKey: ["job-edit", id],
    queryFn: () => JobsApi.get(id!),
    enabled: mode === "edit" && !!id,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [benefits, setBenefits] = useState("");
  const [type, setType] = useState<JobType>("FULL_TIME");
  const [site, setSite] = useState<JobSite>("ONSITE");
  const [salary, setSalary] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState<Region>("CENTRE");
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    if (mode === "edit" && existing.data) {
      const j = existing.data;
      setTitle(j.title);
      setDescription(j.description ?? "");
      setBenefits(j.benefits ?? "");
      if (j.type) setType(j.type);
      if (j.site) setSite(j.site);
      setSalary(j.salary?.toString() ?? "");
      setCity(j.location?.city ?? "");
      if (j.location?.region) setRegion(j.location.region);
      if (j.company?.id) setCompanyId(j.company.id);
    }
  }, [existing.data, mode]);

  useEffect(() => {
    if (mode === "create" && !companyId && companies.data?.[0]?.id) {
      setCompanyId(companies.data[0].id);
    }
  }, [companies.data, mode, companyId]);

  /**
   * The backend expects @ModelAttribute on JobPostActivityUpsertDto with a
   * nested Address `location` — we send multipart/form-data and use dot
   * notation (location.city, location.region, ...) so Spring binds the
   * nested fields correctly.
   */
  const m = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("title", title);
      if (description) fd.append("description", description);
      if (benefits) fd.append("benefits", benefits);
      fd.append("type", type);
      fd.append("site", site);
      if (salary) fd.append("salary", salary);
      fd.append("salaryCurrency", "XAF");
      if (companyId) fd.append("companyId", companyId);
      fd.append("location.city", city);
      fd.append("location.region", region);
      fd.append("location.stateRegion", region);
      fd.append("location.country", "Cameroon");
      return mode === "edit" && id ? JobsApi.update(id, fd) : JobsApi.create(fd);
    },
    onSuccess: () => {
      toast({ title: t("common.successSaved"), variant: "success" });
      nav("/recruiter/jobs");
    },
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {mode === "create" ? t("jobEditor.createTitle") : t("jobEditor.editTitle")}
        </h1>
      </header>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-5 rounded-2xl border border-border/60 bg-card p-6 elev-1">
        <div className="space-y-2">
          <Label>{t("jobEditor.title")}</Label>
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("jobEditor.description")}</Label>
          <Textarea required rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("jobEditor.benefits")}</Label>
          <Textarea rows={3} value={benefits} onChange={(e) => setBenefits(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("jobEditor.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as JobType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_JOB_TYPES.map((s) => <SelectItem key={s} value={s}>{t(`jobTypes.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("jobEditor.site")}</Label>
            <Select value={site} onValueChange={(v) => setSite(v as JobSite)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_JOB_SITES.map((s) => <SelectItem key={s} value={s}>{t(`jobSites.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("jobEditor.salary")}</Label>
            <Input type="number" min="0" value={salary} onChange={(e) => setSalary(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("jobEditor.city")}</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("jobEditor.region")}</Label>
            <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_REGIONS.map((r) => <SelectItem key={r} value={r}>{t(`regions.${r}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("nav.companies")}</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {companies.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => nav(-1)}>{t("common.cancel")}</Button>
          <Button type="submit" loading={m.isPending}>
            {mode === "create" ? t("jobEditor.publishCta") : t("jobEditor.saveCta")}
          </Button>
        </div>
      </form>
    </div>
  );
}
