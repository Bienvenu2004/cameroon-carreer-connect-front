import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Building2, FileText, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AdminApi } from "@/api";

export function AdminStats() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => AdminApi.stats() });

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
