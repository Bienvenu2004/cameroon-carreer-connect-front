import { useTranslation } from "react-i18next";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Bookmark, Briefcase, Building2, Heart, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApplicationsApi, JobsApi, SavedJobsApi } from "@/api";
import { formatXAF, relativeTime } from "@/lib/utils";
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

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: () => JobsApi.get(id),
    enabled: !!id,
  });

  const apply = useMutation({
    mutationFn: () => ApplicationsApi.apply({ jobId: id }),
    onSuccess: () => toast({ title: t("applications.statuses.APPLIED"), variant: "success" }),
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  const saveJob = useMutation({
    mutationFn: () => SavedJobsApi.toggle(id),
    onSuccess: () => toast({ title: t("common.successSaved"), variant: "success" }),
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="container py-16 text-center text-muted-foreground">{t("common.loading")}</div>;
  }
  if (!job) {
    return <div className="container py-16 text-center text-muted-foreground">{t("errors.notFound")}</div>;
  }

  const company = job.company;
  const handleApply = () => {
    if (!user) { nav(`/login?redirect=/jobs/${id}`); return; }
    if (user.role !== "JOB_SEEKER") {
      toast({ title: t("common.errorOccurred"), description: t("auth.jobSeeker"), variant: "destructive" });
      return;
    }
    apply.mutate();
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
              {company?.status === "APPROVED" && (
                <Badge variant="success" className="gap-1"><BadgeCheck className="h-3 w-3" /> Verified</Badge>
              )}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">{job.title}</h1>
            <Link to={company ? `/companies/${company.id}` : "#"} className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary">
              <Building2 className="h-4 w-4" />
              {company?.name ?? "—"}
            </Link>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />
                {job.location?.city}{job.location?.region && ` · ${t(`regions.${job.location.region}`)}`}
              </span>
              {job.salary && (
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90">
                  {formatXAF(job.salary as number, locale)} / mois
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                {t("jobs.postedAt")} {relativeTime(job.postedDate ?? job.createdAt, locale)}
              </span>
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
            <Button size="lg" className="w-full" loading={apply.isPending} onClick={handleApply}>
              <Heart className="h-4 w-4" /> {t("jobs.applyToJob")}
            </Button>
            <Button size="lg" variant="outline" className="mt-2 w-full" loading={saveJob.isPending} onClick={() => user ? saveJob.mutate() : nav(`/login?redirect=/jobs/${id}`)}>
              <Bookmark className="h-4 w-4" /> {t("jobs.saveJob")}
            </Button>
          </div>

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
    </div>
  );
}
