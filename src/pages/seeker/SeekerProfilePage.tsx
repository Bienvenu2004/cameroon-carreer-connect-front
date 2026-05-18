import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Download, Facebook, FileText, Github, Globe, Languages,
  Linkedin, Link as LinkIcon, Mail, MapPin, Pencil, Phone, Twitter,
  Upload, User as UserIcon, X,
} from "lucide-react";

import { SeekerApi } from "@/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { useAuthStore } from "@/stores/auth";
import { apiErrorMessage } from "@/lib/api";
import { initials } from "@/lib/utils";
import {
  ALL_REGIONS,
  type JobSeekerProfileDto,
  type Region,
} from "@/types/api";

/* ============================================================================
 *  Job-Seeker Profile page
 *
 *  Two rendering modes:
 *    - "view": read-only display of every field returned by /me, with an
 *      "Edit profile" button and links/preview for uploaded files.
 *    - "edit": form pre-filled from the current profile data. Submits a
 *      multipart PATCH that mirrors JobSeekerProfileSaveDto on the backend
 *      (firstName, lastName, phoneNumber, address.* dot-notation, work
 *      preferences, resume, profilePhoto, skills[i].name). On success we
 *      invalidate the React-Query cache and pop back to view mode so the
 *      latest persisted values show up immediately.
 * ==========================================================================*/
export function SeekerProfilePage() {
  const { t } = useTranslation();
  const profileQuery = useQuery({
    queryKey: ["seeker-profile"],
    queryFn: () => SeekerApi.me(),
  });

  const [editing, setEditing] = useState(false);

  if (profileQuery.isLoading) {
    return (
      <div className="text-muted-foreground">{t("common.loading")}</div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {t("common.errorOccurred")}
      </div>
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {t("profile.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("profile.subtitle")}
          </p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> {t("profile.editProfile")}
          </Button>
        )}
      </header>

      {editing ? (
        <ProfileEditForm
          profile={profile}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      ) : (
        <ProfileView profile={profile} />
      )}
    </div>
  );
}

/* ============================================================================
 *  View mode
 * ==========================================================================*/
function ProfileView({ profile }: { profile: JobSeekerProfileDto }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-4">
      {/* Identity ---------------------------------------------------------- */}
      <Card>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            {profile.profilePhoto?.url && (
              <AvatarImage src={profile.profilePhoto.url} alt={fullName} />
            )}
            <AvatarFallback className="text-2xl">
              {initials(fullName || user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-display text-xl font-semibold">
              {fullName || t("profile.notSet")}
            </div>
            {user?.email && (
              <div className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Personal info ----------------------------------------------------- */}
      <Section title={t("profile.personalInfo")}>
        <Field label={t("profile.firstName")} value={profile.firstName} />
        <Field label={t("profile.lastName")} value={profile.lastName} />
      </Section>

      {/* Contact ----------------------------------------------------------- */}
      <Section title={t("profile.contactSection")}>
        <Field
          icon={Phone}
          label={t("profile.phone")}
          value={profile.phoneNumber}
        />
      </Section>

      {/* Address ----------------------------------------------------------- */}
      <Section title={t("profile.addressSection")}>
        <Field
          icon={MapPin}
          label={t("profile.street")}
          value={profile.address?.street}
        />
        <Field label={t("profile.city")} value={profile.address?.city} />
        <Field
          label={t("profile.region")}
          value={
            profile.address?.region
              ? t(`regions.${profile.address.region}`)
              : undefined
          }
        />
        <Field label={t("profile.country")} value={profile.address?.country} />
      </Section>

      {/* Work preferences -------------------------------------------------- */}
      <Section title={t("profile.workPreferences")}>
        <Field
          icon={Briefcase}
          label={t("profile.workAuth")}
          value={profile.workAuthorization}
        />
        <Field
          label={t("profile.employmentType")}
          value={profile.employmentType}
        />
      </Section>

      {/* Skills ------------------------------------------------------------ */}
      <Card>
        <SectionHeader title={t("profile.skills")} />
        {profile.skills && profile.skills.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.skills.map((s, i) => (
              <Badge key={s.id ?? `${s.name}-${i}`} variant="secondary">
                {s.name}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">
            {t("profile.notSet")}
          </div>
        )}
      </Card>

      {/* Spoken languages -------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.spokenLanguages")} />
        {(() => {
          const langs = parseSpokenLanguages(profile.spokenLanguages);
          return langs.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {langs.map((l, i) => (
                <Badge key={`${l}-${i}`} variant="secondary" className="gap-1">
                  <Languages className="h-3 w-3" /> {l}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">
              {t("profile.notSet")}
            </div>
          );
        })()}
      </Card>

      {/* Portfolio & social ------------------------------------------------ */}
      <Card>
        <SectionHeader title={t("profile.portfolioLinks")} />
        {hasAnyLink(profile) ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <LinkRow icon={Github}   label={t("profile.githubUrl")}    url={profile.githubUrl} />
            <LinkRow icon={Linkedin} label={t("profile.linkedinUrl")}  url={profile.linkedinUrl} />
            <LinkRow icon={Globe}    label={t("profile.websiteUrl")}   url={profile.websiteUrl} />
            <LinkRow icon={LinkIcon} label={t("profile.portfolioUrl")} url={profile.portfolioUrl} />
            <LinkRow icon={Twitter}  label={t("profile.twitterUrl")}   url={profile.twitterUrl} />
            <LinkRow icon={Facebook} label={t("profile.facebookUrl")}  url={profile.facebookUrl} />
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">
            {t("profile.notSet")}
          </div>
        )}
      </Card>

      {/* Documents --------------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.documents")} />
        <div className="mt-3">
          {profile.resume?.url ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/30 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-sm font-medium">
                  {profile.resume.name ?? "resume"}
                </span>
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
            <div className="text-sm text-muted-foreground">
              {t("profile.noResume")}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================================
 *  Edit mode
 * ==========================================================================*/
function ProfileEditForm({
  profile,
  onCancel,
  onSaved,
}: {
  profile: JobSeekerProfileDto;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();

  // Initial form state derived once from the loaded profile. We then track
  // changes in local state — the source of truth becomes the controlled
  // inputs until the next refetch.
  const [firstName, setFirstName] = useState(profile.firstName ?? "");
  const [lastName, setLastName] = useState(profile.lastName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber ?? "");
  const [street, setStreet] = useState(profile.address?.street ?? "");
  const [city, setCity] = useState(profile.address?.city ?? "");
  const [region, setRegion] = useState<Region | "">(
    (profile.address?.region as Region) ?? ""
  );
  const [country, setCountry] = useState(profile.address?.country ?? "Cameroon");
  const [workAuthorization, setWorkAuthorization] = useState(
    profile.workAuthorization ?? ""
  );
  const [employmentType, setEmploymentType] = useState(
    profile.employmentType ?? ""
  );

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoPreviewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile]
  );
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const [skills, setSkills] = useState<string[]>(
    profile.skills?.map((s) => s.name).filter(Boolean) ?? []
  );
  const [skillDraft, setSkillDraft] = useState("");

  const addSkill = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (skills.some((s) => s.toLowerCase() === name.toLowerCase())) return;
    setSkills([...skills, name]);
    setSkillDraft("");
  };

  // Spoken languages — same tag-input pattern as skills, persisted as a
  // comma-separated string in JobSeekerProfile.spokenLanguages.
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>(
    parseSpokenLanguages(profile.spokenLanguages)
  );
  const [languageDraft, setLanguageDraft] = useState("");
  const addLanguage = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (spokenLanguages.some((s) => s.toLowerCase() === name.toLowerCase())) return;
    setSpokenLanguages([...spokenLanguages, name]);
    setLanguageDraft("");
  };

  // Portfolio / social links — plain URL inputs, all optional.
  const [githubUrl, setGithubUrl]       = useState(profile.githubUrl ?? "");
  const [linkedinUrl, setLinkedinUrl]   = useState(profile.linkedinUrl ?? "");
  const [websiteUrl, setWebsiteUrl]     = useState(profile.websiteUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl ?? "");
  const [twitterUrl, setTwitterUrl]     = useState(profile.twitterUrl ?? "");
  const [facebookUrl, setFacebookUrl]   = useState(profile.facebookUrl ?? "");

  const save = useMutation({
    mutationFn: async () => {
      // Client-side validation — required name fields. Anything else can be
      // left blank and will fall back to the existing value on the backend
      // (NullValuePropertyMappingStrategy.IGNORE) or to a literal empty.
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error(t("profile.personalInfo"));
      }

      const fd = new FormData();
      fd.append("firstName", firstName.trim());
      fd.append("lastName", lastName.trim());
      fd.append("phoneNumber", phoneNumber.trim());
      // Embedded Address — dot notation binds via Spring's WebDataBinder.
      fd.append("address.street", street.trim());
      fd.append("address.city", city.trim());
      if (region) fd.append("address.region", region);
      fd.append("address.country", country.trim());
      fd.append("workAuthorization", workAuthorization.trim());
      fd.append("employmentType", employmentType.trim());

      // Spoken languages — stored on the backend as a comma-separated string.
      fd.append("spokenLanguages", spokenLanguages.join(","));

      // Portfolio / social URLs — always send (empty string clears the value).
      fd.append("githubUrl",    githubUrl.trim());
      fd.append("linkedinUrl",  linkedinUrl.trim());
      fd.append("websiteUrl",   websiteUrl.trim());
      fd.append("portfolioUrl", portfolioUrl.trim());
      fd.append("twitterUrl",   twitterUrl.trim());
      fd.append("facebookUrl",  facebookUrl.trim());

      // Files: only attach if the user picked a new one. Empty
      // MultipartFiles are guarded server-side, but skipping the field
      // avoids needlessly wrapping an empty Part.
      if (resumeFile) fd.append("resume", resumeFile);
      if (photoFile) fd.append("profilePhoto", photoFile);

      // Skills replace the whole list — service does setSkills(newList).
      skills.forEach((name, i) => fd.append(`skills[${i}].name`, name));

      return SeekerApi.update(fd);
    },
    onSuccess: () => {
      toast({ title: t("common.successSaved"), variant: "success" });
      // Force a refetch so the new file URLs / persisted values render in
      // the view that comes after we leave edit mode.
      void qc.invalidateQueries({ queryKey: ["seeker-profile"] });
      onSaved();
    },
    onError: (e) =>
      toast({
        title: t("common.errorOccurred"),
        description: apiErrorMessage(e),
        variant: "destructive",
      }),
  });

  const currentPhotoSrc =
    photoPreviewUrl ?? profile.profilePhoto?.url ?? undefined;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-4"
    >
      {/* Profile photo --------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.uploadPhoto")} />
        <div className="mt-3 flex items-center gap-4">
          <Avatar className="h-20 w-20">
            {currentPhotoSrc && (
              <AvatarImage src={currentPhotoSrc} alt="preview" />
            )}
            <AvatarFallback>
              <UserIcon className="h-8 w-8 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm hover:bg-accent">
              <Upload className="h-4 w-4 text-primary" />
              <span>
                {photoFile?.name ?? t("profile.uploadPhoto")}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) =>
                  setPhotoFile(e.target.files?.[0] ?? null)
                }
              />
            </label>
            {photoFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPhotoFile(null)}
              >
                <X className="h-3.5 w-3.5" /> {t("common.cancel")}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Personal info ---------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.personalInfo")} />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("profile.firstName")}</Label>
            <Input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("profile.lastName")}</Label>
            <Input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Contact ---------------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.contactSection")} />
        <div className="mt-3 space-y-2">
          <Label>{t("profile.phone")}</Label>
          <Input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+237 ..."
            inputMode="tel"
          />
        </div>
      </Card>

      {/* Address ---------------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.addressSection")} />
        <div className="mt-3 space-y-4">
          <div className="space-y-2">
            <Label>{t("profile.street")}</Label>
            <Input
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("profile.city")}</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("profile.region")}</Label>
              <Select
                value={region}
                onValueChange={(v) => setRegion(v as Region)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("home.regionPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {ALL_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`regions.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("profile.country")}</Label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Work preferences ------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.workPreferences")} />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("profile.workAuth")}</Label>
            <Input
              value={workAuthorization}
              onChange={(e) => setWorkAuthorization(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("profile.employmentType")}</Label>
            <Input
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              placeholder="FULL_TIME / PART_TIME / ..."
            />
          </div>
        </div>
      </Card>

      {/* Skills ----------------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.skills")} />
        <div className="mt-3 space-y-3">
          <Input
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill(skillDraft);
              }
            }}
            placeholder={t("profile.skillsPlaceholder")}
          />
          <div className="flex flex-wrap gap-2">
            {skills.map((s, i) => (
              <Badge
                key={`${s}-${i}`}
                variant="secondary"
                className="gap-1"
              >
                {s}
                <button
                  type="button"
                  className="rounded-full hover:bg-muted-foreground/20"
                  onClick={() =>
                    setSkills(skills.filter((_, j) => j !== i))
                  }
                  aria-label={t("common.delete")}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Spoken languages ------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.spokenLanguages")} />
        <div className="mt-3 space-y-3">
          <Input
            value={languageDraft}
            onChange={(e) => setLanguageDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLanguage(languageDraft);
              }
            }}
            placeholder={t("profile.spokenLanguagesHint")}
          />
          <div className="flex flex-wrap gap-2">
            {spokenLanguages.map((s, i) => (
              <Badge
                key={`${s}-${i}`}
                variant="secondary"
                className="gap-1"
              >
                <Languages className="h-3 w-3" /> {s}
                <button
                  type="button"
                  className="rounded-full hover:bg-muted-foreground/20"
                  onClick={() =>
                    setSpokenLanguages(spokenLanguages.filter((_, j) => j !== i))
                  }
                  aria-label={t("common.delete")}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Portfolio / social ----------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.portfolioLinks")} />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <UrlInput
            icon={Github}
            label={t("profile.githubUrl")}
            value={githubUrl}
            onChange={setGithubUrl}
            placeholder="https://github.com/..."
          />
          <UrlInput
            icon={Linkedin}
            label={t("profile.linkedinUrl")}
            value={linkedinUrl}
            onChange={setLinkedinUrl}
            placeholder="https://linkedin.com/in/..."
          />
          <UrlInput
            icon={Globe}
            label={t("profile.websiteUrl")}
            value={websiteUrl}
            onChange={setWebsiteUrl}
            placeholder="https://..."
          />
          <UrlInput
            icon={LinkIcon}
            label={t("profile.portfolioUrl")}
            value={portfolioUrl}
            onChange={setPortfolioUrl}
            placeholder="https://..."
          />
          <UrlInput
            icon={Twitter}
            label={t("profile.twitterUrl")}
            value={twitterUrl}
            onChange={setTwitterUrl}
            placeholder="https://x.com/..."
          />
          <UrlInput
            icon={Facebook}
            label={t("profile.facebookUrl")}
            value={facebookUrl}
            onChange={setFacebookUrl}
            placeholder="https://facebook.com/..."
          />
        </div>
      </Card>

      {/* Resume ----------------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.uploadResume")} />
        <div className="mt-3 space-y-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm hover:bg-accent">
            <Upload className="h-4 w-4 text-primary" />
            <span>{resumeFile?.name ?? t("profile.uploadResume")}</span>
            <input
              type="file"
              // Backend FileServiceImpl.ALLOWED_FILES currently only permits
              // application/pdf for documents — keep the picker honest so
              // users don't get a server-side rejection after selecting
              // a Word doc.
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(e) =>
                setResumeFile(e.target.files?.[0] ?? null)
              }
            />
          </label>
          <p className="text-xs text-muted-foreground">
            PDF only · max 50 MB
          </p>
          {!resumeFile && profile.resume?.name && (
            <p className="text-xs text-muted-foreground">
              {t("profile.currentResume")}: {profile.resume.name}
            </p>
          )}
          {resumeFile && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setResumeFile(null)}
            >
              <X className="h-3.5 w-3.5" /> {t("common.cancel")}
            </Button>
          )}
        </div>
      </Card>

      {/* Actions ---------------------------------------------------------- */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={save.isPending}
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={save.isPending}>
          {t("profile.saveChanges")}
        </Button>
      </div>
    </form>
  );
}

/* ============================================================================
 *  Layout helpers (kept here to keep the page self-contained)
 * ==========================================================================*/
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 elev-1">
      {children}
    </div>
  );
}

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
    <Card>
      <SectionHeader title={title} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Phone;
  label: string;
  value?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-border/40 bg-card p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
        {value && value.trim().length > 0 ? (
          <span className="truncate">{value}</span>
        ) : (
          <span className="text-muted-foreground italic">
            {t("profile.notSet")}
          </span>
        )}
      </div>
    </div>
  );
}

/* ----------------------- profile-only utility helpers -------------------- */

/** Split the backend's comma-separated spokenLanguages string into a trimmed
 *  array, dropping empty tokens. Safe for null/undefined input. */
function parseSpokenLanguages(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Whether any of the optional social/portfolio URLs are present on the
 *  profile — drives whether we render the section or a "Not set" placeholder. */
function hasAnyLink(p: JobSeekerProfileDto): boolean {
  return Boolean(
    p.githubUrl || p.linkedinUrl || p.websiteUrl ||
    p.portfolioUrl || p.twitterUrl || p.facebookUrl
  );
}

/** Small labelled URL input used by the Portfolio & social links section
 *  in edit mode. type=url gives free browser validation but we don't
 *  enforce required so users can clear a field by submitting an empty value. */
function UrlInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="inline-flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </Label>
      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

/** One row in the Portfolio & social links section — only renders if a URL
 *  is present. Opens the link in a new tab with safe rel attributes. */
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
