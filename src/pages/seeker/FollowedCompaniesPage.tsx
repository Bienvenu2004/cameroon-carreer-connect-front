import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, Building2, MapPin } from "lucide-react";

import { CompaniesApi } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/common/Pagination";
import { FollowCompanyButton } from "@/components/common/FollowCompanyButton";
import { storageUrl } from "@/lib/api";

/**
 * Employers the seeker follows.
 *
 * Each row leads with the number of jobs open right now, because that is the
 * reason the person followed the employer in the first place — the list is a
 * shortcut to "who that I care about is hiring", not a collection to admire.
 */
export function FollowedCompaniesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["followed-companies", page],
    queryFn: () => CompaniesApi.followed(page, 12),
  });

  const rows = data?.content ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("follow.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("follow.subtitle")}</p>
      </header>

      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/70 px-6 py-12 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium text-foreground">{t("follow.none")}</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            {t("follow.noneHint")}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/companies">{t("nav.companies")}</Link>
          </Button>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map((c) => (
              <li
                key={c.companyId}
                className="rounded-xl border border-border/60 bg-card p-4 elev-1"
              >
                <div className="flex items-start gap-3">
                  {c.logo?.id ? (
                    <img
                      src={storageUrl(c.logo.id)}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <Building2 className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/companies/${c.companyId}`}
                      className="font-display font-semibold text-foreground hover:text-primary"
                    >
                      {c.name}
                    </Link>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {c.industry && <span>{t(`industries.${c.industry}`)}</span>}
                      {(c.city || c.region) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {c.city}{c.city && c.region ? ", " : ""}
                          {c.region ? t(`regions.${c.region}`) : ""}
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5">
                      {c.openJobs > 0 ? (
                        <Link
                          to={`/jobs?company=${encodeURIComponent(c.name)}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          {t("follow.openJobs", { count: c.openJobs })}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <Badge variant="secondary">{t("follow.noOpenJobs")}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <FollowCompanyButton companyId={c.companyId} />
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 1}
            isLast={data?.isLast ?? true}
            totalElements={data?.totalElements ?? 0}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
