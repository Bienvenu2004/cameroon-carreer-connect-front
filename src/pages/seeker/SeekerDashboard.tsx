import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bookmark, FileText, Search as SearchIcon } from "lucide-react";

import { ApplicationsApi, JobsApi, SavedJobsApi, SavedSearchApi } from "@/api";
import { useAuthStore } from "@/stores/auth";
import { JobCard } from "@/components/common/JobCard";
import { RecommendationsSection } from "@/components/seeker/RecommendationsSection";
import { Button } from "@/components/ui/button";

export function SeekerDashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const apps = useQuery({ queryKey: ["my-applications"], queryFn: () => ApplicationsApi.list({ size: 5 }) });
  const saved = useQuery({ queryKey: ["my-saved-jobs"], queryFn: () => SavedJobsApi.list({ size: 4 }) });
  const searches = useQuery({ queryKey: ["my-saved-searches"], queryFn: () => SavedSearchApi.list() });
  const recommended = useQuery({ queryKey: ["recommended-jobs"], queryFn: () => JobsApi.list({ size: 6, sortBy: "createdAt", sortOrder: "DESC", isActive: true }) });

  const name = user?.jobSeekerProfile?.firstName ?? user?.email?.split("@")[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("greetings.hello")}, {name} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">{t("home.heroSubtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={FileText} label={t("nav.applications")} value={apps.data?.totalElements ?? 0} link="/seeker/applications" />
        <StatCard icon={Bookmark} label={t("nav.savedJobs")} value={saved.data?.totalElements ?? 0} link="/seeker/saved-jobs" />
        <StatCard icon={SearchIcon} label={t("nav.savedSearches")} value={searches.data?.length ?? 0} link="/seeker/saved-searches" />
      </div>

      <RecommendationsSection />

      <section>
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold">{t("home.featuredJobs")}</h2>
          <Button variant="ghost" size="sm" asChild><Link to="/jobs">{t("common.viewAll")} <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recommended.data?.content.slice(0, 6).map((j) => <JobCard key={j.id} job={j} />)}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, link }: { icon: typeof FileText; label: string; value: number; link: string }) {
  return (
    <Link to={link} className="group rounded-2xl border border-border/60 bg-card p-5 elev-1 transition-all hover:elev-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-primary group-hover:underline">{label} →</div>
    </Link>
  );
}
