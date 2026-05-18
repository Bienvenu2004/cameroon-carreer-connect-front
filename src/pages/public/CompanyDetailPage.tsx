import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Building2, ExternalLink, MapPin, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/common/JobCard";
import { CompaniesApi, JobsApi } from "@/api";

export function CompanyDetailPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const company = useQuery({ queryKey: ["company", id], queryFn: () => CompaniesApi.get(id), enabled: !!id });
  const jobs = useQuery({
    queryKey: ["company-jobs", id],
    queryFn: () => JobsApi.list({ companyName: company.data?.name, isActive: true, size: 12 }),
    enabled: !!company.data?.name,
  });

  if (company.isLoading) return <div className="container py-16 text-center text-muted-foreground">{t("common.loading")}</div>;
  if (!company.data) return <div className="container py-16 text-center text-muted-foreground">{t("errors.notFound")}</div>;
  const c = company.data;

  return (
    <div className="container py-10">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/companies"><ArrowLeft className="mr-1 h-4 w-4" /> {t("common.back")}</Link>
      </Button>

      <div className="rounded-2xl border border-border/60 bg-card p-8 elev-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">{c.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {c.industry && <Badge variant="default">{t(`industries.${c.industry}`)}</Badge>}
                {c.size && <Badge variant="outline">{c.size}</Badge>}
                {c.status === "APPROVED" && <Badge variant="success" className="gap-1"><BadgeCheck className="h-3 w-3" /> Verified</Badge>}
                {c.address?.city && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.address.city}{c.address.region ? ` · ${t(`regions.${c.address.region}`)}` : ""}</span>
                )}
              </div>
            </div>
          </div>
          {c.website && (
            <Button asChild variant="outline">
              <a href={c.website} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="h-4 w-4" /> {t("company.website")}
              </a>
            </Button>
          )}
        </div>
        {c.description && <p className="mt-6 max-w-3xl text-foreground/85 leading-relaxed">{c.description}</p>}
        {c.promoVideoUrl && (
          <Button asChild variant="outline" size="sm" className="mt-4">
            <a href={c.promoVideoUrl} target="_blank" rel="noreferrer noopener">
              <PlayCircle className="h-4 w-4" /> {t("company.promoVideoLabel")}
            </a>
          </Button>
        )}
      </div>

      {c.about && (
        <section className="mt-6 rounded-2xl border border-border/60 bg-card p-8 elev-1">
          <h2 className="font-display text-xl font-semibold">{t("company.about")}</h2>
          <p className="mt-3 max-w-3xl whitespace-pre-line text-foreground/85 leading-relaxed">
            {c.about}
          </p>
        </section>
      )}

      <h2 className="mt-10 font-display text-xl font-semibold">{t("nav.jobs")}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {jobs.data?.content.map((j) => <JobCard key={j.id} job={j} />)}
        {jobs.isSuccess && jobs.data.content.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
            {t("jobs.noJobsFound")}
          </div>
        )}
      </div>
    </div>
  );
}
