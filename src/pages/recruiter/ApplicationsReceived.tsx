import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase, Download, FileText, Mail, MapPin, Phone, UserCircle2,
} from "lucide-react";

import { ApplicationsApi, SeekerApi } from "@/api";
import { ApplicationStatusBadge } from "@/components/common/StatusBadge";
import { Pagination } from "@/components/common/Pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";
import { initials, relativeTime } from "@/lib/utils";
import type { ApplicationStatus, JobApplicationDto } from "@/types/api";

const STATUSES: ApplicationStatus[] = ["APPLIED", "REVIEWED", "INTERVIEW", "HIRED", "REJECTED"];

export function ApplicationsReceived() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);

  /** Which application's profile dialog is currently open, if any. */
  const [openApp, setOpenApp] = useState<JobApplicationDto | null>(null);

  const filter = {
    page,
    size: 20,
    sortBy: "createdAt",
    sortOrder: "DESC" as const,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["recruiter-applications", filter],
    queryFn: () => ApplicationsApi.list(filter),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      ApplicationsApi.updateStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["recruiter-applications"] });
      toast({ title: t("common.successSaved"), variant: "success" });
    },
    onError: (e) => toast({
      title: t("common.errorOccurred"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("applications.received")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("applications.receivedSubtitle")}</p>
      </header>

      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card elev-1">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 text-left font-medium">{t("nav.jobs")}</th>
              <th className="p-4 text-left font-medium">{t("applications.viewProfile")}</th>
              <th className="p-4 text-left font-medium">{t("applications.appliedOn")}</th>
              <th className="p-4 text-left font-medium">{t("applications.status")}</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {data?.content.map((a) => (
              <tr key={a.id} className="border-b border-border/40 last:border-0 hover:bg-accent/30">
                <td className="p-4">
                  {a.jobId
                    ? <Link to={`/jobs/${a.jobId}`} className="font-medium hover:text-primary">{a.jobTitle ?? "—"}</Link>
                    : "—"}
                </td>
                <td className="p-4">{a.candidateName || "—"}</td>
                <td className="p-4 text-muted-foreground">{relativeTime(a.applyDate, locale)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <ApplicationStatusBadge status={a.status} />
                    <Select value={a.status} onValueChange={(v) => update.mutate({ id: a.id, status: v as ApplicationStatus })}>
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`applications.statuses.${s}`)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </td>
                <td className="p-4 text-right">
                  {a.profileId && (
                    <Button variant="ghost" size="sm" onClick={() => setOpenApp(a)}>
                      <UserCircle2 className="h-4 w-4" /> {t("applications.viewProfile")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {data?.content.length === 0 && (
              <tr><td className="p-8 text-center text-muted-foreground" colSpan={5}>{t("common.noResults")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination
          page={data.pageNumber}
          totalPages={data.totalPages}
          isLast={data.isLast}
          totalElements={data.totalElements}
          onChange={setPage}
        />
      )}

      <CandidateProfileDialog
        app={openApp}
        onClose={() => setOpenApp(null)}
      />
    </div>
  );
}

/* =============================================================================
 *  Candidate profile dialog
 *
 *  Opened from the "View profile" column of the recruiter's applications list.
 *  Fetches the seeker's full profile by ID and renders avatar, contact info,
 *  address, skills, and a download link for the resume (if any). Uses
 *  `enabled: !!app?.profileId` so the request fires only when the dialog
 *  actually opens — switching between candidates re-fetches automatically.
 * ===========================================================================*/
function CandidateProfileDialog({
  app,
  onClose,
}: {
  app: JobApplicationDto | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const profileId = app?.profileId;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["seeker-profile-by-id", profileId],
    queryFn: () => SeekerApi.getById(profileId!),
    enabled: !!profileId,
  });

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ")
    || app?.candidateName
    || "—";

  return (
    <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("applications.viewProfile")}</DialogTitle>
          {app?.jobTitle && (
            <DialogDescription className="inline-flex items-center gap-1 text-xs">
              <Briefcase className="h-3 w-3" /> {app.jobTitle}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading && (
          <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
        )}

        {!isLoading && profile && (
          <div className="space-y-6">
            {/* Header: avatar + name */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {profile.profilePhoto?.url && <AvatarImage src={profile.profilePhoto.url} alt={fullName} />}
                <AvatarFallback className="text-lg">{initials(fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-display text-xl font-semibold">{fullName}</div>
                {profile.employmentType && (
                  <div className="text-xs text-muted-foreground">{profile.employmentType}</div>
                )}
              </div>
            </div>

            {/* Contact + location grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.phoneNumber && (
                <InfoRow icon={Phone} label={t("profile.phone")} value={profile.phoneNumber} />
              )}
              {profile.address?.phone && profile.address.phone !== profile.phoneNumber && (
                <InfoRow icon={Phone} label={t("profile.phone")} value={profile.address.phone} />
              )}
              {(profile.address?.city || profile.address?.country) && (
                <InfoRow
                  icon={MapPin}
                  label={t("profile.city")}
                  value={[
                    profile.address?.city,
                    profile.address?.region ? t(`regions.${profile.address.region}`) : null,
                    profile.address?.country,
                  ].filter(Boolean).join(", ")}
                />
              )}
              {profile.workAuthorization && (
                <InfoRow icon={Mail} label="Work authorization" value={profile.workAuthorization} />
              )}
            </div>

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("profile.skills")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s) => (
                    <Badge key={s.id ?? s.name} variant="secondary">{s.name}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Resume */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("profile.currentResume")}
              </div>
              {profile.resume?.url ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-sm">{profile.resume.name ?? "resume"}</span>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={profile.resume.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      download={profile.resume.name ?? undefined}
                    >
                      <Download className="h-4 w-4" /> {t("profile.downloadResume")}
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">—</div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon: Icon, label, value,
}: {
  icon: typeof Phone; label: string; value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/40 bg-card p-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
