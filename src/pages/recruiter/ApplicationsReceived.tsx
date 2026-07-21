import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase, Calendar, Download, Eye, Facebook, FileText, Github, Globe, Languages,
  Linkedin, Link as LinkIcon, Mail, MapPin, Phone, Twitter, UserCircle2,
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
import type {
  ApplicationStatus, FileDto, JobApplicationDto, JobSeekerProfileDto, WorkExperienceDto,
} from "@/types/api";

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
 *  Resume panel
 *
 *  Lets the recruiter either stream the candidate's resume inline (an embedded
 *  PDF viewer, toggled on demand so the dialog stays compact) or download it.
 *
 *  Resumes live on Cloudinary as `raw` resources: the bare secure URL is served
 *  inline (viewable in-browser), and appending `fl_attachment=true` forces the
 *  browser to download instead — mirroring the backend's downloadFile() logic.
 * ===========================================================================*/
function ResumePanel({ resume }: { resume: FileDto | null }) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState(false);

  const url = resume?.url;

  if (!url) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("profile.currentResume")}
        </div>
        <div className="text-sm text-muted-foreground italic">{t("profile.noResume")}</div>
      </div>
    );
  }

  const isPdf = (resume?.type ?? "").includes("pdf") || url.toLowerCase().includes(".pdf");
  const downloadHref = url.includes("?") ? `${url}&fl_attachment=true` : `${url}?fl_attachment=true`;

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
          {/* PDFs stream inline in an embedded viewer; other formats (e.g. docx)
              can't be embedded, so open them in a new tab instead. */}
          {isPdf ? (
            <Button size="sm" variant="outline" onClick={() => setPreview((v) => !v)}>
              <Eye className="h-4 w-4" /> {preview ? t("profile.hideResume") : t("profile.viewResume")}
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <a href={url} target="_blank" rel="noreferrer noopener">
                <Eye className="h-4 w-4" /> {t("profile.viewResume")}
              </a>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <a
              href={downloadHref}
              target="_blank"
              rel="noreferrer noopener"
              download={resume?.name ?? undefined}
            >
              <Download className="h-4 w-4" /> {t("profile.downloadResume")}
            </a>
          </Button>
        </div>
      </div>
      {preview && isPdf && (
        <iframe
          src={url}
          title={resume?.name ?? "resume"}
          className="mt-3 h-[70vh] w-full rounded-lg border border-border/60 bg-background"
        />
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
