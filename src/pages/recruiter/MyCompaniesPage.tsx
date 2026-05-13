import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Edit, MapPin, Plus } from "lucide-react";

import { CompaniesApi } from "@/api";
import { Button } from "@/components/ui/button";
import { CompanyStatusBadge } from "@/components/common/StatusBadge";
import type { CompanyDto } from "@/types/api";

export function MyCompaniesPage() {
  const { t } = useTranslation();
  const mine = useQuery({
    queryKey: ["my-recruiter-companies"],
    queryFn: () => CompaniesApi.mine(),
  });

  // Defensive: backend should always return an array now. Normalize in case
  // an older backend build (returning a single object or null) is still running.
  const companies: CompanyDto[] = Array.isArray(mine.data)
    ? mine.data
    : mine.data
    ? [mine.data as unknown as CompanyDto]
    : [];

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {t("company.listTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("company.listSubtitle")}</p>
        </div>
        <Button asChild>
          <Link to="/recruiter/companies/new">
            <Plus className="h-4 w-4" /> {t("company.createNew")}
          </Link>
        </Button>
      </header>

      {mine.isLoading && (
        <div className="text-muted-foreground">{t("common.loading")}</div>
      )}

      {!mine.isLoading && companies.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">{t("company.noCompanies")}</p>
          <Button asChild className="mt-4">
            <Link to="/recruiter/companies/new">
              <Plus className="h-4 w-4" /> {t("company.createNew")}
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {companies.map((c) => (
          <article
            key={c.id}
            className="group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 elev-1 transition-all hover:elev-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-semibold">{c.name}</h3>
                  {c.industry && (
                    <div className="text-xs text-muted-foreground">
                      {t(`industries.${c.industry}`)}
                    </div>
                  )}
                </div>
              </div>
              {c.status && <CompanyStatusBadge status={c.status} />}
            </div>

            {c.description && (
              <p className="line-clamp-2 text-sm text-foreground/80">{c.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {c.address?.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {c.address.city}
                  {c.address.region && ` · ${t(`regions.${c.address.region}`)}`}
                </span>
              )}
              {(c.activeJobs ?? 0) > 0 && (
                <span className="font-medium text-primary">
                  {c.activeJobs} {t("nav.jobs").toLowerCase()}
                </span>
              )}
            </div>

            {c.rejectionReason && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                {c.rejectionReason}
              </p>
            )}

            <div className="mt-auto flex items-center justify-end gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link to={`/recruiter/companies/${c.id}/edit`}>
                  <Edit className="h-3.5 w-3.5" /> {t("company.edit")}
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
