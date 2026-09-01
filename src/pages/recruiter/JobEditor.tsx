import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

import { CompaniesApi, JobsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";
import {
  ALL_DIPLOMA_LEVELS, ALL_EXPERIENCE_LEVELS,
  ALL_JOB_LANGUAGES, ALL_JOB_SITES, ALL_JOB_TYPES, ALL_REGIONS,
  type DiplomaLevel, type ExperienceLevel,
  type JobLanguage, type JobSite, type JobType, type Region,
} from "@/types/api";

/** Sentinel for "no preference", since a Select cannot hold an empty value. */
const NONE = "__none__";

export function JobEditor({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const { toast } = useToast();

  // Recruiter's own companies. CompaniesApi.mine() returns all of them
  // regardless of moderation status; we then filter to APPROVED only so
  // pending / rejected / suspended companies are never selectable when
  // posting a job. The backend enforces the same rule independently —
  // this is purely for UX (no point showing options that would 403).
  const companies = useQuery({
    queryKey: ["my-companies-for-job"],
    queryFn: () => CompaniesApi.mine(),
  });
  const approvedCompanies = useMemo(
    () => (companies.data ?? []).filter((c) => c.status === "APPROVED"),
    [companies.data]
  );

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
  // Required working language for the role — drives the language badge
  // and the language filter on the public jobs listing.
  const [requiredLanguage, setRequiredLanguage] = useState<JobLanguage | "">("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | typeof NONE>(NONE);
  const [minimumDiploma, setMinimumDiploma] = useState<DiplomaLevel | typeof NONE>(NONE);
  const [applicationDeadline, setApplicationDeadline] = useState("");
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
      if (j.requiredLanguage) setRequiredLanguage(j.requiredLanguage);
      setSalaryMin(j.salaryMin?.toString() ?? "");
      setSalaryMax(j.salaryMax?.toString() ?? "");
      setExperienceLevel(j.experienceLevel ?? NONE);
      setMinimumDiploma(j.minimumDiploma ?? NONE);
      setApplicationDeadline(j.applicationDeadline ?? "");
      setCity(j.location?.city ?? "");
      if (j.location?.region) setRegion(j.location.region);
      if (j.company?.id) setCompanyId(j.company.id);
    }
  }, [existing.data, mode]);

  useEffect(() => {
    // Auto-select the recruiter's first APPROVED company on create. If
    // they have none approved yet, leave companyId blank — the empty-state
    // notice below explains why and the Save button stays disabled.
    if (mode === "create" && !companyId && approvedCompanies[0]?.id) {
      setCompanyId(approvedCompanies[0].id);
    }
  }, [approvedCompanies, mode, companyId]);

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
      if (requiredLanguage) fd.append("requiredLanguage", requiredLanguage);
      if (salaryMin) fd.append("salaryMin", salaryMin);
      if (salaryMax) fd.append("salaryMax", salaryMax);
      fd.append("salaryCurrency", "XAF");
      if (experienceLevel !== NONE) fd.append("experienceLevel", experienceLevel);
      if (minimumDiploma !== NONE) fd.append("minimumDiploma", minimumDiploma);
      if (applicationDeadline) fd.append("applicationDeadline", applicationDeadline);
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
        <div className="space-y-2">
          <Label>{t("jobEditor.requiredLanguage")}</Label>
          <Select
            value={requiredLanguage}
            onValueChange={(v) => setRequiredLanguage(v as JobLanguage)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("jobEditor.requiredLanguagePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {ALL_JOB_LANGUAGES.map((lng) => (
                <SelectItem key={lng} value={lng}>
                  {t(`jobs.languages.${lng}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("jobEditor.requiredLanguageHint")}
          </p>
        </div>
        {/* Pay as a band. Asking for one figure mostly produced blank salary
            fields, which is the worst outcome in a market where pay is rarely
            advertised at all -- a range is easier to commit to. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("jobEditor.salaryMin")}</Label>
            <Input
              type="number"
              min="0"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("jobEditor.salaryMax")}</Label>
            <Input
              type="number"
              min="0"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">{t("jobEditor.salaryHint")}</p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("jobEditor.experienceLevel")}</Label>
            <Select
              value={experienceLevel}
              onValueChange={(v) => setExperienceLevel(v as ExperienceLevel | typeof NONE)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("jobEditor.anyLevel")}</SelectItem>
                {ALL_EXPERIENCE_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{t(`experienceLevels.${l}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("jobEditor.minimumDiploma")}</Label>
            <Select
              value={minimumDiploma}
              onValueChange={(v) => setMinimumDiploma(v as DiplomaLevel | typeof NONE)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("jobEditor.anyDiploma")}</SelectItem>
                {ALL_DIPLOMA_LEVELS.map((d) => (
                  <SelectItem key={d} value={d}>{t(`diplomas.${d}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("jobEditor.deadline")}</Label>
            <Input
              type="date"
              value={applicationDeadline}
              onChange={(e) => setApplicationDeadline(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("jobEditor.deadlineHint")}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
          {approvedCompanies.length > 0 ? (
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
          ) : (
            // No approved companies → block job creation with an inline
            // notice + a CTA back to the My Companies page. Same shape as
            // the backend's defense (it would 403 otherwise).
            <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
              <div className="flex-1 space-y-2">
                <p className="text-foreground/85">
                  {t("jobEditor.noApprovedCompanies")}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/recruiter/companies">
                    {t("jobEditor.manageCompanies")}
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => nav(-1)}>{t("common.cancel")}</Button>
          <Button
            type="submit"
            loading={m.isPending}
            // Defense in depth: even with a sneakily-retained companyId
            // from a stale render, block submit when no APPROVED company
            // is available. The backend would reject too.
            disabled={!companyId || approvedCompanies.length === 0}
          >
            {mode === "create" ? t("jobEditor.publishCta") : t("jobEditor.saveCta")}
          </Button>
        </div>
      </form>
    </div>
  );
}
