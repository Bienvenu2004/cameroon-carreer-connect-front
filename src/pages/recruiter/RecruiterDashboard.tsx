import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, Eye, FileText } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { AnalyticsApi } from "@/api";
import { Button } from "@/components/ui/button";

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "hsl(167 50% 60%)",
  REVIEWED: "hsl(167 78% 38%)",
  INTERVIEW: "hsl(46 60% 52%)",
  HIRED: "hsl(152 60% 36%)",
  REJECTED: "hsl(4 65% 47%)",
};

export function RecruiterDashboard() {
  const { t } = useTranslation();
  const stats = useQuery({ queryKey: ["analytics-dashboard"], queryFn: () => AnalyticsApi.dashboard() });

  const statusData = Object.entries(stats.data?.applicationsByStatus ?? {}).map(([k, v]) => ({ name: k, value: v }));
  const monthData = Object.entries(stats.data?.applicationsByMonth ?? {}).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("nav.dashboard")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
        </div>
        <Button asChild><Link to="/recruiter/jobs/new"><Briefcase className="h-4 w-4" /> {t("jobEditor.createTitle")}</Link></Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={Briefcase} label={t("admin.totalJobs")} value={stats.data?.totalJobs ?? 0} />
        <KPI icon={Briefcase} label={t("admin.activeJobs")} value={stats.data?.totalActiveJobs ?? 0} />
        <KPI icon={Eye} label={t("home.stats.totalViews")} value={stats.data?.totalViews ?? 0} />
        <KPI icon={FileText} label={t("admin.totalApps")} value={stats.data?.totalApplications ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={t("applications.status")}>
          {statusData.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {statusData.map((d) => (
                    <Cell key={d.name} fill={STATUS_COLORS[d.name] ?? "hsl(var(--primary))"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title={t("applications.appliedOn")}>
          {monthData.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold">{t("nav.myJobs")}</h2>
          <Button variant="ghost" size="sm" asChild><Link to="/recruiter/jobs">{t("common.viewAll")} <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card elev-1">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4 text-left font-medium">{t("nav.jobs")}</th>
                <th className="p-4 text-left font-medium">{t("home.stats.jobs")}</th>
                <th className="p-4 text-left font-medium">{t("admin.totalApps")}</th>
              </tr>
            </thead>
            <tbody>
              {stats.data?.jobsStats.slice(0, 5).map((j) => (
                <tr key={j.jobId} className="border-b border-border/40 last:border-0 hover:bg-accent/30">
                  <td className="p-4 font-medium">{j.jobTitle}</td>
                  <td className="p-4">{j.views}</td>
                  <td className="p-4">{j.applicationsCount}</td>
                </tr>
              ))}
              {stats.data?.jobsStats.length === 0 && (
                <tr><td className="p-6 text-center text-muted-foreground" colSpan={3}>{t("common.noResults")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KPI({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 elev-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
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
