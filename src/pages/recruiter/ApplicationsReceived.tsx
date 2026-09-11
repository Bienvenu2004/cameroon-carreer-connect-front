import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase, Calendar, Download, Eye, Facebook, FileText, Github, Globe, Languages,
  Linkedin, Link as LinkIcon, Mail, MapPin, Phone, Twitter, UserCircle2, Video,
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
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage, storageUrl } from "@/lib/api";
import { initials, relativeTime } from "@/lib/utils";
import type {
  ApplicationStatus, FileDto, JobApplicationDto, JobSeekerProfileDto,
  UpdateApplicationStatusPayload, WorkExperienceDto,
} from "@/types/api";

/**
 * Statuses that email the candidate and are hard to undo — a mistaken hire,
 * interview invite, or rejection all send mail. We require an explicit
 * confirmation step for these; APPLIED/REVIEWED apply immediately.
 */
const CONFIRM_STATUSES: ApplicationStatus[] = ["INTERVIEW", "HIRED", "REJECTED"];

const STATUSES: ApplicationStatus[] = ["APPLIED", "REVIEWED", "INTERVIEW", "HIRED", "REJECTED"];

export function ApplicationsReceived() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);

  /** Which application's profile dialog is currently open, if any. */
  const [openApp, setOpenApp] = useState<JobApplicationDto | null>(null);

  /**
   * A status change awaiting confirmation (INTERVIEW/HIRED/REJECTED). Holds
   * the target application and the requested status; null when no dialog open.
   */
  const [pending, setPending] = useState<{ app: JobApplicationDto; status: ApplicationStatus } | null>(null);

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
    mutationFn: ({ id, payload }: { id: string; payload: ApplicationStatus | UpdateApplicationStatusPayload }) =>
      ApplicationsApi.updateStatus(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["recruiter-applications"] });
      setPending(null);
      toast({ title: t("common.successSaved"), variant: "success" });
    },
    onError: (e) => toast({
      title: t("common.errorOccurred"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  /**
   * Requested from the per-row status <Select>. Emailing statuses go through a
   * confirmation dialog; the rest apply immediately. No-op if unchanged.
   */
  function requestStatusChange(app: JobApplicationDto, status: ApplicationStatus) {
    if (status === app.status) return;
    if (CONFIRM_STATUSES.includes(status)) {
      setPending({ app, status });
    } else {
      update.mutate({ id: app.id, payload: status });
    }
  }

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
                    <Select value={a.status} onValueChange={(v) => requestStatusChange(a, v as ApplicationStatus)}>
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

      <StatusChangeDialog
        pending={pending}
        submitting={update.isPending}
        onCancel={() => setPending(null)}
        onConfirm={(payload) => pending && update.mutate({ id: pending.app.id, payload })}
      />
    </div>
  );
}

/* =============================================================================
 *  Status change confirmation dialog
 *
 *  Guards the three "emailing" statuses so a recruiter can't hire, invite, or
 *  reject a candidate by a stray click:
 *    - HIRED / REJECTED: a plain confirm step (both send an email; HIRED also
 *      closes the job to the public).
 *    - INTERVIEW: a small form for the interview place, date/time, phone and an
 *      optional note — all included in the invitation email to the candidate.
 *
 *  The native datetime-local value ("2026-07-28T10:00") is already a valid
 *  LocalDateTime on the wire, so it's sent as-is.
 * ===========================================================================*/
function StatusChangeDialog({
  pending,
  submitting,
  onCancel,
  onConfirm,
}: {
  pending: { app: JobApplicationDto; status: ApplicationStatus } | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (payload: UpdateApplicationStatusPayload) => void;
}) {
  const { t } = useTranslation();
  const [place, setPlace] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [statusReason, setStatusReason] = useState("");

  const status = pending?.status;
  const isInterview = status === "INTERVIEW";

  // Reset the form whenever a new change is requested.
  useEffect(() => {
    if (pending) {
      setPlace("");
      setDateTime("");
      setPhone("");
      setNote("");
      setStatusReason("");
    }
  }, [pending]);

  // Interview requires at least a place and a date/time before it can send.
  const canSubmit = !isInterview || (place.trim().length > 0 && dateTime.length > 0);

  function handleConfirm() {
    if (!status) return;
    if (isInterview) {
      onConfirm({
        status,
        interviewPlace: place.trim(),
        interviewDateTime: dateTime,
        interviewPhone: phone.trim() || undefined,
        interviewNote: note.trim() || undefined,
        statusReason: statusReason.trim() || undefined,
      });
    } else {
      onConfirm({ status, statusReason: statusReason.trim() || undefined });
    }
  }

  const candidate = pending?.app.candidateName || t("applications.theCandidate");
  const jobTitle = pending?.app.jobTitle ?? "";

  return (
    <Dialog open={!!pending} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isInterview
              ? t("applications.confirm.interviewTitle")
              : status === "HIRED"
                ? t("applications.confirm.hiredTitle")
                : t("applications.confirm.rejectedTitle")}
          </DialogTitle>
          <DialogDescription>
            {isInterview
              ? t("applications.confirm.interviewDesc", { name: candidate, job: jobTitle })
              : status === "HIRED"
                ? t("applications.confirm.hiredDesc", { name: candidate, job: jobTitle })
                : t("applications.confirm.rejectedDesc", { name: candidate, job: jobTitle })}
          </DialogDescription>
        </DialogHeader>

        {/* A reason for the bad news too.
            This dialog carried four fields of care for an interview invitation
            and nothing at all for a rejection, so candidates learned they were
            rejected and never why. Being ghosted is the most common complaint
            job seekers have; one sentence costs a recruiter a click. */}
        {status === "REJECTED" && (
          <div className="space-y-1.5 py-2">
            <Label htmlFor="status-reason">{t("applications.rejectionReason")}</Label>
            <Textarea
              id="status-reason"
              rows={3}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("applications.rejectionReasonHint")}
            </p>
          </div>
        )}

        {isInterview && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="iv-place">{t("applications.interview.place")}</Label>
              <Input
                id="iv-place"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder={t("applications.interview.placePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iv-datetime">{t("applications.interview.dateTime")}</Label>
              <Input
                id="iv-datetime"
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iv-phone">{t("applications.interview.phone")}</Label>
              <Input
                id="iv-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("applications.interview.phonePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iv-note">{t("applications.interview.note")}</Label>
              <Textarea
                id="iv-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("applications.interview.notePlaceholder")}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
            variant={status === "REJECTED" ? "destructive" : "default"}
          >
            {isInterview
              ? t("applications.confirm.sendInvite")
              : t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =============================================================================
 *  Resume panel
 *
 *  Lets the recruiter view (open inline in a new tab) or download the
 *  candidate's resume. Both go through the backend /storage endpoints, which
 *  stream the bytes with the correct Content-Type and filename.
 *
 *  Why not link straight to Cloudinary: resumes are stored as `raw` resources
 *  whose delivery URL has no `.pdf` extension, so Cloudinary serves them as
 *  octet-stream — the browser then can't preview them and downloads an
 *  extension-less "unknown" file. Streaming through /storage fixes both the
 *  view (inline disposition) and the download (attachment + proper name).
 *
 *  We open the preview in a new tab rather than an inline <iframe> so it isn't
 *  blocked by the backend's X-Frame-Options and works cross-origin in dev.
 * ===========================================================================*/
function ResumePanel({ resume }: { resume: FileDto | null }) {
  const { t } = useTranslation();

  const fileId = resume?.id;

  if (!fileId) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("profile.currentResume")}
        </div>
        <div className="text-sm text-muted-foreground italic">{t("profile.noResume")}</div>
      </div>
    );
  }

  const viewHref = storageUrl(fileId);
  const downloadHref = storageUrl(fileId, { download: true });

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t("profile.currentResume")}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm">{resume?.name ?? "resume"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={viewHref} target="_blank" rel="noreferrer noopener">
              <Eye className="h-4 w-4" /> {t("profile.viewResume")}
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={downloadHref} target="_blank" rel="noreferrer noopener">
              <Download className="h-4 w-4" /> {t("profile.downloadResume")}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
 *  Video-résumé panel
 *
 *  Streams the candidate's short-form video introduction directly from its
 *  Cloudinary `video` delivery URL (HTTP range / CDN) inside a <video> player.
 *  Playback only — controlsList="nodownload" hides the download control and we
 *  offer no download link, per product decision.
 * ===========================================================================*/
function VideoResumePanel({ video }: { video: FileDto | null }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Video className="h-3.5 w-3.5" /> {t("profile.videoResume")}
      </div>
      {video?.url ? (
        <video
          src={video.url}
          controls
          controlsList="nodownload"
          preload="metadata"
          className="w-full max-h-[360px] rounded-lg border border-border/50 bg-black"
        >
          {t("profile.videoUnsupported")}
        </video>
      ) : (
        <div className="text-sm text-muted-foreground italic">{t("profile.noVideoResume")}</div>
      )}
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
      {/* max-h + overflow lets the dialog stay scrollable now that we render
          the FULL JobSeekerProfileResponseDto (avatar, address, languages,
          work prefs, skills, all 6 portfolio links, resume). */}
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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

        {app && app.status === "INTERVIEW" && (app.interviewPlace || app.interviewDateTime) && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Calendar className="h-3.5 w-3.5" /> {t("applications.interview.scheduled")}
            </div>
            <div className="grid gap-1.5 text-sm">
              {app.interviewDateTime && (
                <div><span className="text-muted-foreground">{t("applications.interview.dateTime")}: </span>
                  <span className="font-medium">{formatInterviewDateTime(app.interviewDateTime)}</span></div>
              )}
              {app.interviewPlace && (
                <div><span className="text-muted-foreground">{t("applications.interview.place")}: </span>
                  <span className="font-medium">{app.interviewPlace}</span></div>
              )}
              {app.interviewPhone && (
                <div><span className="text-muted-foreground">{t("applications.interview.phone")}: </span>
                  <span className="font-medium">{app.interviewPhone}</span></div>
              )}
              {app.interviewNote && (
                <div className="whitespace-pre-wrap"><span className="text-muted-foreground">{t("applications.interview.note")}: </span>
                  <span className="font-medium">{app.interviewNote}</span></div>
              )}
            </div>
          </div>
        )}

        {!isLoading && profile && (
          <div className="space-y-6">
            {/* Header: avatar + name --------------------------------------- */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {profile.profilePhoto?.url && (
                  <AvatarImage src={profile.profilePhoto.url} alt={fullName} />
                )}
                <AvatarFallback className="text-lg">{initials(fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-display text-xl font-semibold">{fullName}</div>
                {(profile.firstName || profile.lastName) && (
                  <div className="text-xs text-muted-foreground">
                    {[profile.firstName, profile.lastName].filter(Boolean).join(" ")}
                  </div>
                )}
              </div>
            </div>

            {/* Contact + work preferences ---------------------------------- */}
            <Section title={t("profile.contactSection")}>
              <InfoRow icon={Phone} label={t("profile.phone")} value={profile.phoneNumber} />
              <InfoRow
                icon={Briefcase}
                label={t("profile.workAuth")}
                value={profile.workAuthorization}
              />
              <InfoRow
                icon={Mail}
                label={t("profile.employmentType")}
                value={profile.employmentType}
              />
            </Section>

            {/* Address ------------------------------------------------------ */}
            <Section title={t("profile.addressSection")}>
              <InfoRow icon={MapPin} label={t("profile.street")} value={profile.address?.street} />
              <InfoRow label={t("profile.city")} value={profile.address?.city} />
              <InfoRow
                label={t("profile.region")}
                value={
                  profile.address?.region
                    ? t(`regions.${profile.address.region}`)
                    : undefined
                }
              />
              <InfoRow label={t("profile.country")} value={profile.address?.country} />
            </Section>

            {/* Spoken languages -------------------------------------------- */}
            <div>
              <SectionHeader title={t("profile.spokenLanguages")} />
              {(() => {
                const langs = parseSpokenLanguages(profile.spokenLanguages);
                return langs.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {langs.map((l, i) => (
                      <Badge key={`${l}-${i}`} variant="secondary" className="gap-1">
                        <Languages className="h-3 w-3" /> {l}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground italic">
                    {t("profile.notSet")}
                  </div>
                );
              })()}
            </div>

            {/* Skills ------------------------------------------------------ */}
            <div>
              <SectionHeader title={t("profile.skills")} />
              {profile.skills && profile.skills.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.skills.map((s, i) => (
                    <Badge key={s.id ?? `${s.name}-${i}`} variant="secondary">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground italic">
                  {t("profile.notSet")}
                </div>
              )}
            </div>

            {/* Work experience -------------------------------------------- *
             * The backend ships these on every /job-seeker-profile/{id}
             * response (same DTO the seeker's own page uses) — recruiter
             * just needed the read-side render. Mirrors the seeker self-
             * view layout so candidates and recruiters see the same shape. */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <SectionHeader title={t("profile.workExperience")} />
                {typeof profile.totalYearsOfExperience === "number"
                  && profile.totalYearsOfExperience > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Briefcase className="h-3 w-3" />
                    {t("profile.yearsOfExperience", { count: profile.totalYearsOfExperience })}
                  </Badge>
                )}
              </div>
              {profile.experiences && profile.experiences.length > 0 ? (
                <ol className="mt-3 space-y-4">
                  {profile.experiences.map((xp, i) => (
                    <RecruiterExperienceRow key={xp.id ?? i} xp={xp} />
                  ))}
                </ol>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground italic">
                  {t("profile.notSet")}
                </div>
              )}
            </div>

            {/* Portfolio / social ------------------------------------------ */}
            <div>
              <SectionHeader title={t("profile.portfolioLinks")} />
              {hasAnyLink(profile) ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <LinkRow icon={Github}   label={t("profile.githubUrl")}    url={profile.githubUrl} />
                  <LinkRow icon={Linkedin} label={t("profile.linkedinUrl")}  url={profile.linkedinUrl} />
                  <LinkRow icon={Globe}    label={t("profile.websiteUrl")}   url={profile.websiteUrl} />
                  <LinkRow icon={LinkIcon} label={t("profile.portfolioUrl")} url={profile.portfolioUrl} />
                  <LinkRow icon={Twitter}  label={t("profile.twitterUrl")}   url={profile.twitterUrl} />
                  <LinkRow icon={Facebook} label={t("profile.facebookUrl")}  url={profile.facebookUrl} />
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground italic">
                  {t("profile.notSet")}
                </div>
              )}
            </div>

            {/* Resume ------------------------------------------------------ */}
            <ResumePanel resume={profile.resume ?? null} />

            {/* Video introduction ----------------------------------------- */}
            <VideoResumePanel video={profile.videoResume ?? null} />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================================
 *  Helper components & utilities used inside CandidateProfileDialog
 *
 *  The dialog renders every field of JobSeekerProfileResponseDto, so we
 *  rely on a few small components below to keep the markup tidy:
 *    - Section / SectionHeader: titled wrapper around grouped InfoRows
 *    - InfoRow: one labelled value, with italic "Not set" placeholder
 *    - LinkRow: clickable URL row (only renders when the link is present)
 *  Plus two pure helpers for parsing the spokenLanguages CSV and detecting
 *  whether any portfolio/social URL is set at all.
 * ============================================================================*/

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionHeader title={title} />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Phone;
  label: string;
  value?: string | null;
}) {
  const { t } = useTranslation();
  const hasValue = !!value && value.trim().length > 0;
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/40 bg-card p-3 text-sm">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        {hasValue ? (
          <div className="truncate font-medium text-foreground">{value}</div>
        ) : (
          <div className="font-medium italic text-muted-foreground">
            {t("profile.notSet")}
          </div>
        )}
      </div>
    </div>
  );
}

/** Split the backend's comma-separated `spokenLanguages` string into a
 *  trimmed array. Safe for null/undefined input. */
function parseSpokenLanguages(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Whether the profile has any of the optional portfolio/social URLs set. */
function hasAnyLink(p: JobSeekerProfileDto): boolean {
  return Boolean(
    p.githubUrl || p.linkedinUrl || p.websiteUrl ||
    p.portfolioUrl || p.twitterUrl || p.facebookUrl
  );
}

/** One labelled link row — only renders if the URL is non-empty. Opens
 *  in a new tab with safe rel attributes. */
function LinkRow({
  icon: Icon,
  label,
  url,
}: {
  icon: typeof Phone;
  label: string;
  url?: string | null;
}) {
  if (!url || url.trim().length === 0) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex items-center gap-3 rounded-md border border-border/40 bg-card p-3 text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate font-medium text-foreground group-hover:text-primary">
          {url}
        </div>
      </div>
    </a>
  );
}

/**
 * One experience row in the recruiter's view of a candidate. Compact —
 * the dialog has a max-h and we want as many roles visible at once as
 * possible. Layout mirrors the seeker's own profile view so the same
 * data reads the same way for whoever's looking.
 */
function RecruiterExperienceRow({ xp }: { xp: WorkExperienceDto }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const loc = [xp.city, xp.country].filter(Boolean).join(", ");
  const range = formatXpRange(xp.startDate, xp.endDate, xp.isCurrent, locale, t);

  return (
    <li className="flex gap-3">
      <div className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Briefcase className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium leading-tight">{xp.title}</div>
        <div className="text-sm text-foreground/80">
          {xp.companyName}
          {loc && <span className="text-muted-foreground"> · {loc}</span>}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {range}
        </div>
        {xp.description && (
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/85">
            {xp.description}
          </p>
        )}
      </div>
    </li>
  );
}

/** Format an ISO LocalDateTime ("2026-07-28T10:00") for display. Falls back
 *  to the raw string if it isn't parseable. */
function formatInterviewDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

/** Locale-aware "Jan 2022 — Jun 2024" / "Jan 2022 — Present" formatter. */
function formatXpRange(
  start: string | undefined,
  end: string | null | undefined,
  isCurrent: boolean,
  locale: string,
  t: (k: string) => string,
): string {
  const fmt = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short" }).format(d);
  };
  const s = fmt(start);
  const e = isCurrent ? t("profile.xp.present") : fmt(end);
  if (!s && !e) return "";
  if (!e) return s;
  return `${s} — ${e}`;
}
