import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, BadgeCheck, Briefcase, Building2, Edit, ExternalLink,
  Eye, MapPin, PlayCircle, Plus,
} from "lucide-react";

import { CompaniesApi, JobsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyStatusBadge } from "@/components/common/StatusBadge";
import { relativeTime } from "@/lib/utils";

/**
 * Recruiter-facing company detail page (`/recruiter/companies/:id`).
 *
 * Unlike the public CompanyDetailPage this is the owner's management view:
 *   - shows the real logo + banner images (not a placeholder),
 *   - surfaces every field including moderation status / rejection reason,
 *   - lists ALL jobs posted under the company (active AND closed), each
 *     linking to its editor — because the recruiter manages them here.
 *
 * Jobs are pulled from the recruiter's own listing endpoint (JobsApi.myList)
 * filtered by company name, so only the current recruiter's jobs show and
 * inactive ones are included (no isActive filter).
 */
export function RecruiterCompanyDetailPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";

  const company = useQuery({
    queryKey: ["recruiter-company", id],
    queryFn: () => CompaniesApi.get(id),
    enabled: !!id,
  });

  const jobs = useQuery({
    queryKey: ["recruiter-company-jobs", id, company.data?.name],
    queryFn: () =>
      JobsApi.myList({
        companyName: company.data?.name,
        size: 100,
        sortBy: "createdAt",
        sortOrder: "DESC",
      }),
    enabled: !!company.data?.name,
  });

  if (company.isLoading) {
    return <div className="text-muted-foreground">{t("common.loading")}</div>;
  }
  if (company.isError || !company.data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {t("common.errorOccurred")}
      </div>
    );
  }
  const c = company.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/recruiter/companies">
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/recruiter/companies/${c.id}/edit`}>
            <Edit className="h-4 w-4" /> {t("company.edit")}
          </Link>
        </Button>
      </div>

      {/* Banner ------------------------------------------------------------ */}
      {c.banner?.url && (
        <div className="overflow-hidden rounded-2xl border border-border/60 elev-1">
          <img
            src={c.banner.url}
            alt={c.name}
            className="h-48 w-full object-cover sm:h-64"
          />
        </div>
      )}

      {/* Identity ---------------------------------------------------------- */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elev-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Real logo image, falling back to a placeholder icon. */}
            {c.logo?.url ? (
              <img
                src={c.logo.url}
                alt={c.name}
                className="h-16 w-16 shrink-0 rounded-xl border border-border/50 object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight">{c.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {c.industry && <Badge variant="default">{t(`industries.${c.industry}`)}</Badge>}
                {c.size && <Badge variant="outline">{c.size}</Badge>}
                {c.status && <CompanyStatusBadge status={c.status} />}
                {c.status === "APPROVED" && (
                  <Badge variant="success" className="gap-1">
                    <BadgeCheck className="h-3 w-3" /> {t("company.statuses.APPROVED")}
                  </Badge>
                )}
                {c.address?.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {c.address.city}
                    {c.address.region ? ` · ${t(`regions.${c.address.region}`)}` : ""}
                    {c.address.country ? ` · ${c.address.country}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.website && (
              <Button asChild variant="outline" size="sm">
                <a href={c.website} target="_blank" rel="noreferrer noopener">
                  <ExternalLink className="h-4 w-4" /> {t("company.website")}
                </a>
              </Button>
            )}
            {c.promoVideoUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={c.promoVideoUrl} target="_blank" rel="noreferrer noopener">
                  <PlayCircle className="h-4 w-4" /> {t("company.promoVideoLabel")}
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Moderation status notice — mirrors MyCompanyPage messaging. */}
        {c.status === "PENDING" && (
          <p className="mt-4 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-foreground/85">
            {t("company.pendingNotice")}
          </p>
        )}
        {c.status === "APPROVED" && (
          <p className="mt-4 rounded-md border border-success/40 bg-success/5 p-3 text-sm text-foreground/85">
            {t("company.verifiedNotice")}
          </p>
        )}
        {c.status === "REJECTED" && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {t("company.rejectedNotice", { reason: c.rejectionReason ?? "" })}
          </p>
        )}
        {c.status === "SUSPENDED" && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {t("company.suspendedNotice", { reason: c.rejectionReason ?? "" })}
          </p>
        )}

        {c.description && (
          <p className="mt-6 max-w-3xl leading-relaxed text-foreground/85">{c.description}</p>
        )}
      </div>

      {/* About ------------------------------------------------------------- */}
      {c.about && (
        <section className="rounded-2xl border border-border/60 bg-card p-6 elev-1">
          <h2 className="font-display text-lg font-semibold">{t("company.about")}</h2>
          <p className="mt-3 max-w-3xl whitespace-pre-line leading-relaxed text-foreground/85">
            {c.about}
          </p>
        </section>
      )}

      {/* Jobs -------------------------------------------------------------- */}
      <section className="rounded-2xl border border-border/60 bg-card p-6 elev-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{t("company.postedJobs")}</h2>
          {c.status === "APPROVED" && (
            <Button asChild size="sm">
              <Link to="/recruiter/jobs/quick">
                <Plus className="h-4 w-4" /> {t("jobEditor.createTitle")}
              </Link>
            </Button>
          )}
        </div>

        {jobs.isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

        <div className="space-y-3">
          {jobs.data?.content.map((j) => (
            <div
              key={j.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-background p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/jobs/${j.id}`}
                    className="inline-flex items-center gap-1.5 font-display text-sm font-semibold hover:text-primary"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    {j.title}
                  </Link>
                  {j.isActive ? (
                    <Badge variant="success">{t("admin.userActive")}</Badge>
                  ) : (
                    <Badge variant="secondary">{t("admin.userSuspended")}</Badge>
                  )}
                  {j.type && <Badge variant="outline">{t(`jobTypes.${j.type}`)}</Badge>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {j.location?.city}
                  {j.location?.region && ` · ${t(`regions.${j.location.region}`)}`}
                  {" · "}
                  {j.views ?? 0} {t("jobs.views", { defaultValue: "views" })}
                  {" · "}
                  {t("jobs.postedAt")} {relativeTime(j.postedDate ?? j.createdAt, locale)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/jobs/${j.id}`}><Eye className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/recruiter/jobs/${j.id}/edit`}><Edit className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          ))}

          {jobs.isSuccess && jobs.data.content.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
              {t("jobs.noJobsFound")}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
