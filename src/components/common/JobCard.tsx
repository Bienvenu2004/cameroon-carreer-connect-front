import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Briefcase, Languages, MapPin, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatXAF, relativeTime } from "@/lib/utils";
import type { JobDto } from "@/types/api";

export function JobCard({ job }: { job: JobDto }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const company = job.company?.name ?? "—";
  const city = job.location?.city ?? "—";
  const region = job.location?.region;
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group block rounded-xl border border-border/60 bg-card p-5 elev-1 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:elev-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-tight tracking-tight text-foreground group-hover:text-primary">
            {job.title}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground/80">{company}</span>
            {job.company?.status === "APPROVED" && (
              <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified" />
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {job.type && <Badge variant="default">{t(`jobTypes.${job.type}`)}</Badge>}
          {job.requiredLanguage && (
            <Badge variant="outline" className="gap-1">
              <Languages className="h-3 w-3" />
              {t(`jobs.languages.${job.requiredLanguage}`)}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {city}
          {region && <span className="text-foreground/60">· {t(`regions.${region}`)}</span>}
        </span>
        {job.site && (
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            {t(`jobSites.${job.site}`)}
          </span>
        )}
        {job.salary && (
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
            {formatXAF(job.salary as number, locale)}
          </span>
        )}
      </div>

      {job.description && (
        <p className="mt-3 line-clamp-2 text-sm text-foreground/70">{job.description}</p>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("jobs.postedAt")} {relativeTime(job.postedDate ?? job.createdAt, locale)}</span>
        <span className="text-primary group-hover:underline">{t("common.view")} →</span>
      </div>
    </Link>
  );
}
