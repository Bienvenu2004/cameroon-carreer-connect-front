import { useTranslation } from "react-i18next";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Landmark, ArrowLeft, BadgeCheck, Bookmark, Briefcase, Building2, Check, Heart, Languages, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsAppShareButton } from "@/components/common/WhatsAppShareButton";
import { TrustSafetyCard } from "@/components/common/TrustSafetyCard";
<<<<<<< HEAD
import { ApplicationsApi, JobsApi, SavedJobsApi } from "@/api";
import { formatXAF, relativeTime } from "@/lib/utils";
=======
import { JobCard } from "@/components/common/JobCard";
import { ApplicationsApi, JobsApi, SavedJobsApi, ResponsivenessApi } from "@/api";
import { formatSalaryRange, relativeTime } from "@/lib/utils";
>>>>>>> develop
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";

export function JobDetailPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const user = useAuthStore((s) => s.user);
  const nav = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: () => JobsApi.get(id),
    enabled: !!id,
  });

  /**
   * Has the current seeker already applied to THIS job?
   *
   * Backend `GET /api/hjp/jobs/applications` supports a `jobId` filter
   * and auto-scopes to the current user (the spec adds
   * `createdBy = currentUser` server-side). So a positive totalElements
   * count means the seeker has at least one application for this job.
   *
   * Gated on `user?.role === "JOB_SEEKER"` — anonymous visitors,
   * recruiters and admins never fire this query.
   */
  const myAppForThisJob = useQuery({
    queryKey: ["my-app-for-job", id, user?.id],
    queryFn: () => ApplicationsApi.list({ jobId: id, size: 1 }),
    enabled: !!id && user?.role === "JOB_SEEKER",
  });
  const alreadyApplied = (myAppForThisJob.data?.totalElements ?? 0) > 0;

  const apply = useMutation({
    mutationFn: () => ApplicationsApi.apply({ jobId: id }),
    onSuccess: () => {
      toast({ title: t("applications.statuses.APPLIED"), variant: "success" });
      // Flip the button to its "Already applied" state immediately
      // without waiting for a manual reload. Also refresh MyApplications
      // so the new row shows up there.
      void qc.invalidateQueries({ queryKey: ["my-app-for-job", id] });
      void qc.invalidateQueries({ queryKey: ["my-applications-full"] });
    },
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  const saveJob = useMutation({
    mutationFn: () => SavedJobsApi.toggle(id),
    onSuccess: () => {
      toast({ title: t("common.successSaved"), variant: "success" });
      // The save endpoint is now a true toggle server-side — invalidate
      // both saved-job query keys so the SavedJobsPage and the seeker
      // dashboard stat counter both reflect the new state.
      void qc.invalidateQueries({ queryKey: ["saved-jobs"] });
      void qc.invalidateQueries({ queryKey: ["my-saved-jobs"] });
    },
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  /* ---------------- discovery ----------------
   * A job page used to be a dead end: no related roles, no other openings at
   * the same employer, nothing to do but go back.
   *
   * Declared above the loading/not-found guards because hooks must run in the
   * same order on every render. `enabled` keeps them from firing before the
   * job (and its company) are known.
   */
  const companyId = job?.company?.id;

  const similar = useQuery({
    queryKey: ["job-similar", id],
    queryFn: () => JobsApi.similar(id!, 4),
    enabled: !!id && !!job,
  });

  const alsoAtCompany = useQuery({
    queryKey: ["job-company-jobs", id],
    queryFn: () => JobsApi.otherAtCompany(id!, 4),
    enabled: !!id && !!companyId,
  });

  const responsiveness = useQuery({
    queryKey: ["responsiveness", companyId],
    queryFn: () => ResponsivenessApi.forCompany(companyId!),
    enabled: !!companyId,
  });

  if (isLoading) {
    return <div className="container py-16 text-center text-muted-foreground">{t("common.loading")}</div>;
  }
  if (!job) {
    return <div className="container py-16 text-center text-muted-foreground">{t("errors.notFound")}</div>;
  }

  const company = job.company;

  // Apply/Save are reserved for JOB_SEEKERs (and unauthenticated visitors
  // get bounced to the login page, where they can register as a seeker).
  // Recruiters and admins see a small notice instead of the action buttons.
  const canActOnJob = !user || user.role === "JOB_SEEKER";

  // A job that's been closed (e.g. because a candidate was marked HIRED
  // and the backend auto-closed it, or the recruiter closed it manually)
  // can no longer receive applications or be saved. The backend rejects
  // such attempts; we hide the buttons up-front for clean UX.

  const isJobClosed = !job.isActive || !!job.expired;

  const handleApply = () => {
    if (!user) { nav(`/login?redirect=/jobs/${id}`); return; }
    if (user.role !== "JOB_SEEKER") {
      // Defensive — the buttons are hidden for non-seekers, this only
      // fires if someone bypasses the UI.
      toast({ title: t("common.errorOccurred"), description: t("jobs.seekerOnlyAction"), variant: "destructive" });
      return;
    }
    apply.mutate();
  };

  const handleSave = () => {
    if (!user) { nav(`/login?redirect=/jobs/${id}`); return; }
    if (user.role !== "JOB_SEEKER") {
      toast({ title: t("common.errorOccurred"), description: t("jobs.seekerOnlyAction"), variant: "destructive" });
      return;
    }
    saveJob.mutate();
  };

  return (
    <div className="container py-10">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/jobs"><ArrowLeft className="mr-1 h-4 w-4" /> {t("common.back")}</Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="rounded-2xl border border-border/60 bg-card p-8 elev-1">
            <div className="flex flex-wrap items-center gap-2">
              {job.type && <Badge variant="default">{t(`jobTypes.${job.type}`)}</Badge>}
              {job.site && <Badge variant="outline">{t(`jobSites.${job.site}`)}</Badge>}
              {job.requiredLanguage && (
                <Badge variant="outline" className="gap-1">
                  <Languages className="h-3 w-3" />
                  {t(`jobs.languages.${job.requiredLanguage}`)}
                </Badge>
              )}
              {company?.status === "APPROVED" && (
                <Badge variant="success" className="gap-1"><BadgeCheck className="h-3 w-3" /> Verified</Badge>
              )}
            </div>
            {job.publicSector && (
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Landmark className="h-3.5 w-3.5" />
                {t("concours.badge")}
                {job.publicSectorBody ? ` · ${job.publicSectorBody}` : ""}
              </div>
            )}

            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">{job.title}</h1>
            <Link to={company ? `/companies/${company.id}` : "#"} className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary">
              <Building2 className="h-4 w-4" />
              {company?.name ?? "—"}
            </Link>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />
                {job.location?.city}{job.location?.region && ` · ${t(`regions.${job.location.region}`)}`}
              </span>
              {formatSalaryRange(job.salaryMin, job.salaryMax, locale, {
                from: t("jobs.salaryFrom"),
                upTo: t("jobs.salaryUpTo"),
              }) && (
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90">
                  {formatSalaryRange(job.salaryMin, job.salaryMax, locale, {
                    from: t("jobs.salaryFrom"),
                    upTo: t("jobs.salaryUpTo"),
                  })}{" "}
                  {t("jobs.perMonth")}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                {t("jobs.postedAt")} {relativeTime(job.postedDate ?? job.createdAt, locale)}
              </span>
              {/* Urgency the candidate can act on. Nothing on this platform used
                  to age out, so a January posting looked exactly like one made
                  this morning. */}
              {job.applicationDeadline && !job.expired && (
                <span className={`inline-flex items-center gap-1.5 font-medium ${
                  (job.daysUntilDeadline ?? 99) <= 3 ? "text-destructive" : "text-foreground/90"
                }`}>
                  <CalendarClock className="h-3.5 w-3.5" />
                  {job.daysUntilDeadline === 0
                    ? t("jobs.closesToday")
                    : t("jobs.closesIn", { count: job.daysUntilDeadline ?? 0 })}
                </span>
              )}
              {job.expired && (
                <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                  <CalendarClock className="h-3.5 w-3.5" /> {t("jobs.expired")}
                </span>
              )}
            </div>
          </div>

          <article className="mt-6 rounded-2xl border border-border/60 bg-card p-8 elev-1">
            <h2 className="font-display text-xl font-semibold">{t("jobs.description")}</h2>
            <p className="mt-3 whitespace-pre-line text-foreground/85 leading-relaxed">
              {job.description ?? "—"}
            </p>
            {job.benefits && (
              <>
                <h3 className="mt-8 font-display text-lg font-semibold">{t("jobs.benefits")}</h3>
                <p className="mt-2 text-foreground/85 leading-relaxed">{job.benefits}</p>
              </>
            )}
          </article>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border/60 bg-card p-6 elev-1">
            {isJobClosed ? (
              // Position filled / job closed: no actions available at all.
              // Takes precedence over the "already applied" state so even
              // a seeker who applied earlier sees the up-to-date status of
              // the listing. The save button is also hidden because there's
              // nothing to act on.
              <div className="rounded-md border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground">
                {t("jobs.positionFilled")}
              </div>
            ) : canActOnJob ? (
              <>
                {alreadyApplied ? (
                  // Replace the Apply CTA with a disabled "Already applied"
                  // indicator. We keep the Button shape + size so the
                  // sidebar layout doesn't jump when the state flips.
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full cursor-default"
                    disabled
                  >
                    <Check className="h-4 w-4 text-success" /> {t("jobs.alreadyApplied")}
                  </Button>
                ) : (
                  <Button size="lg" className="w-full" loading={apply.isPending} onClick={handleApply}>
                    <Heart className="h-4 w-4" /> {t("jobs.applyToJob")}
                  </Button>
                )}
                <Button size="lg" variant="outline" className="mt-2 w-full" loading={saveJob.isPending} onClick={handleSave}>
                  <Bookmark className="h-4 w-4" /> {t("jobs.saveJob")}
                </Button>
              </>
            ) : (
              // Non-seeker authenticated users (RECRUITER / SYSTEM_ADMIN):
              // intentionally no action buttons. A short notice clarifies
              // why so the page doesn't look broken.
              <div className="rounded-md border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground">
                {t("jobs.seekerOnlyAction")}
              </div>
            )}

            {/* Share is available to everyone, on any job state — WhatsApp
                is the primary way jobs spread in Cameroon. */}
            <WhatsAppShareButton
              url={typeof window !== "undefined" ? window.location.href : ""}
              title={job.title}
              className="mt-2 w-full"
            />
          </div>

          {/* Anti-scam trust notice + report action. */}
          <TrustSafetyCard jobId={id} />

<<<<<<< HEAD
=======
          {/* What the employer actually does with applications. A verification
              badge says the company is real; this says whether applying is worth
              a candidate's evening and their data bundle. */}
          {responsiveness.data?.enoughData && (
            <div className="mt-4 rounded-2xl border border-border/60 bg-card p-5 elev-1">
              <div className="font-display text-sm font-semibold text-foreground">
                {t("responsiveness.title")}
              </div>
              <p className="mt-2 text-sm text-foreground/80">
                {t("responsiveness.rate", { rate: responsiveness.data.responseRate })}
              </p>
              {responsiveness.data.averageDaysToRespond != null && (
                <p className="text-sm text-foreground/80">
                  {t("responsiveness.speed", { days: responsiveness.data.averageDaysToRespond })}
                </p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t("responsiveness.explain")}
              </p>
            </div>
          )}

>>>>>>> develop
          {company && (
            <Link to={`/companies/${company.id}`} className="mt-4 block rounded-2xl border border-border/60 bg-card p-6 elev-1 transition-all hover:elev-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("nav.companies")}</div>
              <div className="mt-1 font-display text-lg font-semibold">{company.name}</div>
              {company.industry && (
                <div className="mt-1 text-sm text-muted-foreground">{t(`industries.${company.industry}`)}</div>
              )}
              {company.description && (
                <p className="mt-3 line-clamp-4 text-sm text-foreground/75">{company.description}</p>
              )}
            </Link>
          )}
        </aside>
      </div>
    
      {/* --------------------------------------------------------------
          Discovery. Rendered after the two-column layout so it reads as a
          footer to the page rather than competing with the job itself.
          Each block is hidden entirely when empty: an empty "similar jobs"
          heading is worse than no heading.
         -------------------------------------------------------------- */}
      {(alsoAtCompany.data?.length ?? 0) > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {t("jobs.moreFromEmployer")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {alsoAtCompany.data!.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </section>
      )}

      {(similar.data?.length ?? 0) > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {t("jobs.similar")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {similar.data!.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </section>
      )}
    </div>
  );
}
