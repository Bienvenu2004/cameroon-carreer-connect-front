import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Building2, FileText, Languages, Users } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { AdminApi, AnalyticsApi } from "@/api";
import { Badge } from "@/components/ui/badge";

const LANGUAGE_COLORS: Record<string, string> = {
  FRENCH:    "hsl(217 91% 60%)",
  ENGLISH:   "hsl(4 65% 47%)",
  BILINGUAL: "hsl(167 78% 38%)",
};

export function AdminStats() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => AdminApi.stats() });
  // Item 6 — Regional Trending dashboard. Loaded in parallel with the
  // platform-stats query; renders below the existing KPI section.
  const regional = useQuery({
    queryKey: ["admin-regional"],
    queryFn: () => AnalyticsApi.regional(),
  });

  if (isLoading) return <div className="text-muted-foreground">{t("common.loading")}</div>;
  if (!data) return null;

  const signupsData = Object.entries(data.signupsByWeek ?? {}).map(([k, v]) => ({ name: k, value: v }));
  const jobsByMonth = Object.entries(data.jobsByMonth ?? {}).map(([k, v]) => ({ name: k, value: v }));
  const jobsByRegion = Object.entries(data.jobsByRegion ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => ({ name: t(`regions.${k}`), value: v }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("admin.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={Users} label={t("admin.totalUsers")} value={data.totalUsers} />
        <KPI icon={Users} label={t("admin.totalSeekers")} value={data.totalJobSeekers} />
        <KPI icon={Users} label={t("admin.totalRecruiters")} value={data.totalRecruiters} />
        <KPI icon={Users} label={t("admin.totalAdmins")} value={data.totalAdmins} />
        <KPI icon={Building2} label={t("admin.totalCompanies")} value={data.totalCompanies} />
        <KPI icon={Building2} label={t("admin.pendingCompanies")} value={data.pendingCompanies} accent="warning" />
        <KPI icon={Building2} label={t("admin.approvedCompanies")} value={data.approvedCompanies} accent="success" />
        <KPI icon={Building2} label={t("admin.rejectedCompanies")} value={data.rejectedCompanies} accent="destructive" />
        <KPI icon={Briefcase} label={t("admin.totalJobs")} value={data.totalJobs} />
        <KPI icon={Briefcase} label={t("admin.activeJobs")} value={data.activeJobs} />
        <KPI icon={FileText} label={t("admin.totalApps")} value={data.totalApplications} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Signups (12 weeks)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={signupsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Jobs by month (6 months)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={jobsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--gold))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Jobs by region">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={jobsByRegion} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ====================== Regional trending dashboard ==================== */}
      <section className="space-y-6 border-t border-border/60 pt-8">
        <header>
          <h2 className="font-display text-xl font-semibold">{t("admin.regional")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.regionalSubtitle")}</p>
        </header>

        {regional.isLoading && (
          <div className="text-muted-foreground">{t("common.loading")}</div>
        )}

        {regional.data && (
          <RegionalSection data={regional.data} />
        )}
      </section>
    </div>
  );
}

/* =========================================================================
 *  Regional dashboard sub-component — receives the regional stats payload
 *  and renders the four panels: language pie, applications-by-region bar,
 *  top skills per region, top companies per region.
 * ======================================================================= */
function RegionalSection({
  data,
}: {
  data: import("@/types/api").RegionalStatsDto;
}) {
  const { t } = useTranslation();

  // Language distribution as recharts-friendly array.
  const langData = Object.entries(data.languageDistribution ?? {})
    .map(([k, v]) => ({ name: k, value: v }));
  const totalLang = langData.reduce((sum, d) => sum + d.value, 0);

  const appsByRegion = Object.entries(data.applicationsByRegion ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ name: t(`regions.${k}`), value: v }));

  // Build a flat list of regions for which we have any skills/companies data.
  const skillsRegions = Object.keys(data.topSkillsByRegion ?? {});
  const companiesRegions = Object.keys(data.topCompaniesByRegion ?? {});

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={t("admin.languageDistribution")}>
          {totalLang > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={langData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {langData.map((d) => (
                    <Cell key={d.name} fill={LANGUAGE_COLORS[d.name] ?? "hsl(var(--primary))"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, t(`jobs.languages.${name}`)]}
                />
                <Legend
                  formatter={(value) => t(`jobs.languages.${value}`)}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyHint />
          )}
        </ChartCard>

        <ChartCard title={t("admin.applicationsByRegion")}>
          {appsByRegion.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={appsByRegion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--gold))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyHint />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={t("admin.topSkillsByRegion")}>
          {skillsRegions.length > 0 ? (
            <div className="space-y-4">
              {skillsRegions.map((regionKey) => (
                <div key={regionKey}>
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium">
                    <Languages className="h-3.5 w-3.5 text-primary" />
                    {t(`regions.${regionKey}`)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.topSkillsByRegion[regionKey].map((s, i) => (
                      <Badge key={`${regionKey}-${s.name}-${i}`} variant="secondary">
                        {s.name} <span className="ml-1 text-muted-foreground">×{s.count}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint />
          )}
        </ChartCard>

        <ChartCard title={t("admin.topCompaniesByRegion")}>
          {companiesRegions.length > 0 ? (
            <div className="space-y-4">
              {companiesRegions.map((regionKey) => (
                <div key={regionKey}>
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    {t(`regions.${regionKey}`)}
                  </div>
                  <ul className="space-y-1 text-sm">
                    {data.topCompaniesByRegion[regionKey].map((c, i) => (
                      <li key={`${regionKey}-${c.name}-${i}`} className="flex items-center justify-between">
                        <span className="truncate">{c.name}</span>
                        <span className="ml-2 text-xs font-medium text-muted-foreground">{c.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint />
          )}
        </ChartCard>
      </div>
    </>
  );
}

function EmptyHint() {
  const { t } = useTranslation();
  return (
    <div className="py-8 text-center text-sm text-muted-foreground">
      {t("admin.noDataYet")}
    </div>
  );
}

function KPI({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: number; accent?: "success" | "warning" | "destructive" }) {
  const tone = accent === "success" ? "text-success" : accent === "warning" ? "text-warning-foreground" : accent === "destructive" ? "text-destructive" : "text-primary";
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 elev-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 elev-1">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}
