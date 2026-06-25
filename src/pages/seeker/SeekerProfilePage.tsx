import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Calendar, Download, Facebook, FileText, Github, Globe, Languages,
  Linkedin, Link as LinkIcon, Mail, MapPin, Pencil, Phone, Plus, Trash2, Twitter,
  Upload, User as UserIcon, X,
} from "lucide-react";

import { SeekerApi, SkillsApi } from "@/api";
import { SPOKEN_LANGUAGES } from "@/data/spokenLanguages";
import { TagAutocomplete } from "@/components/common/TagAutocomplete";
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
  type WorkExperienceDto,
} from "@/types/api";

/* Controlled vocabularies for the work-preference dropdowns.
 *
 * The backend stores both fields as free-form `String`, but offering a
 * fixed option list in the UI keeps the data clean for the AI matcher
 * and downstream analytics. Adding/changing a value here is the only
 * step needed — the read view picks it up via the same i18n keys.
 *
 * EmploymentType options reuse the existing `jobTypes.*` translations
 * (a strict subset — REMOTE belongs on the job-site axis, not here).
 */
const EMPLOYMENT_TYPE_OPTIONS = [
  "FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY", "INTERN", "FREELANCE",
] as const;
const WORK_AUTH_OPTIONS = [
  "CITIZEN", "PERMANENT_RESIDENT", "WORK_PERMIT", "NEEDS_SPONSORSHIP",
] as const;

/**
 * Sentinel value used in the dropdowns to represent "no preference"
 * because Radix Select doesn't allow an empty string for SelectItem
 * values. Translated to "" on submit so the backend receives a cleared
 * field rather than the literal "NONE".
 */
const NONE_VALUE = "__NONE__";

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
          // Translate known enum values; gracefully fall back to the raw
          // string for legacy free-form entries written before this field
          // became a dropdown.
          value={
            profile.workAuthorization
              ? t(`workAuth.${profile.workAuthorization}`, {
                  defaultValue: profile.workAuthorization,
                })
              : undefined
          }
        />
        <Field
          label={t("profile.employmentType")}
          value={
            profile.employmentType
              ? t(`jobTypes.${profile.employmentType}`, {
                  defaultValue: profile.employmentType,
                })
              : undefined
          }
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

      {/* Work experience --------------------------------------------------- */}
      <Card>
        <div className="flex items-center justify-between gap-2">
          <SectionHeader title={t("profile.workExperience")} />
          {typeof profile.totalYearsOfExperience === "number" && profile.totalYearsOfExperience > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Briefcase className="h-3 w-3" />
              {t("profile.yearsOfExperience", { count: profile.totalYearsOfExperience })}
            </Badge>
          )}
        </div>
        {profile.experiences && profile.experiences.length > 0 ? (
          <ol className="mt-4 space-y-4">
            {profile.experiences.map((xp, i) => (
              <ExperienceReadRow key={xp.id ?? i} xp={xp} />
            ))}
          </ol>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">
            {t("profile.experiencesEmpty")}
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

  // Selected skill tags.
  const [skills, setSkills] = useState<string[]>(
    profile.skills?.map((s) => s.name).filter(Boolean) ?? []
  );
  // Current text in the skills input — drives the suggestion fetch below.
  const [skillQuery, setSkillQuery] = useState("");
  // Suggestions fetched from /api/hjp/skills/suggest. Debounced.
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);

  // Debounced server-side autocomplete for skills. We wait 250 ms after the
  // last keystroke before hitting the API so typing doesn't fire one
  // request per character. AbortController cancels stale in-flight calls
  // when the query changes faster than the network.
  useEffect(() => {
    const q = skillQuery.trim();
    if (q.length === 0) {
      setSkillSuggestions([]);
      setSkillsLoading(false);
      return;
    }
    const ac = new AbortController();
    const handle = window.setTimeout(async () => {
      setSkillsLoading(true);
      try {
        const result = await SkillsApi.suggest(q, 8);
        if (!ac.signal.aborted) setSkillSuggestions(result);
      } catch {
        if (!ac.signal.aborted) setSkillSuggestions([]);
      } finally {
        if (!ac.signal.aborted) setSkillsLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(handle);
      ac.abort();
    };
  }, [skillQuery]);

  // Selected language tags — persisted as comma-separated string in
  // JobSeekerProfile.spokenLanguages.
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>(
    parseSpokenLanguages(profile.spokenLanguages)
  );
  const [languageQuery, setLanguageQuery] = useState("");
  // Filter the static SPOKEN_LANGUAGES list by the current input.
  // useMemo so we don't reallocate the array on every keystroke that
  // doesn't change the query (e.g. focus, blur).
  const languageSuggestions = useMemo(() => {
    const q = languageQuery.trim().toLowerCase();
    if (q.length === 0) return [...SPOKEN_LANGUAGES];
    return SPOKEN_LANGUAGES.filter((l) => l.toLowerCase().includes(q));
  }, [languageQuery]);

  // Work experience rows. Client-side draft list mutated through the
  // ExperiencesEditor; sent on submit as indexed multipart keys
  // (experiences[0].title, experiences[0].startDate, ...). The backend
  // service treats this list as authoritative — anything absent gets
  // deleted via orphanRemoval on the OneToMany.
  const [experiences, setExperiences] = useState<WorkExperienceDraft[]>(
    () => (profile.experiences ?? []).map(fromDto)
  );

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

      // Work experiences — same indexed-multipart pattern. Client-side
      // validation here is a quick early-exit; the backend re-validates
      // every row server-side regardless.
      const xpError = validateExperiencesClient(experiences, t);
      if (xpError) throw new Error(xpError);
      experiences.forEach((xp, i) => {
        fd.append(`experiences[${i}].title`, xp.title.trim());
        fd.append(`experiences[${i}].companyName`, xp.companyName.trim());
        if (xp.city.trim()) fd.append(`experiences[${i}].city`, xp.city.trim());
        if (xp.country.trim()) fd.append(`experiences[${i}].country`, xp.country.trim());
        fd.append(`experiences[${i}].startDate`, xp.startDate);
        if (!xp.isCurrent && xp.endDate) {
          fd.append(`experiences[${i}].endDate`, xp.endDate);
        }
        fd.append(`experiences[${i}].isCurrent`, String(xp.isCurrent));
        if (xp.description.trim()) {
          fd.append(`experiences[${i}].description`, xp.description.trim());
        }
      });

      return SeekerApi.update(fd);
    },
    onSuccess: () => {
      toast({ title: t("common.successSaved"), variant: "success" });
      // Force a refetch so the new file URLs / persisted values render in
      // the view that comes after we leave edit mode.
      void qc.invalidateQueries({ queryKey: ["seeker-profile"] });
      // Profile mutations (especially new experience rows / skills / region)
      // change what the AI matcher sees. Evict the cached recommendations
      // so the dashboard re-fetches with the fresh signal next visit —
      // otherwise the user waits up to 5 minutes for the staleTime to
      // expire and wonders why their new role didn't move the needle.
      void qc.invalidateQueries({ queryKey: ["ai-recommendations"] });
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
            {/* Backend stores this as a free String, but offering a
                controlled vocabulary in the UI keeps data clean for the
                AI matcher and downstream analytics. NONE_VALUE maps to
                "" on submit so the user can clear the preference. */}
            <Select
              value={workAuthorization || NONE_VALUE}
              onValueChange={(v) =>
                setWorkAuthorization(v === NONE_VALUE ? "" : v)
              }
            >
              <SelectTrigger aria-label={t("profile.workAuth")}>
                <SelectValue placeholder={t("profile.notSpecified")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>{t("profile.notSpecified")}</SelectItem>
                {WORK_AUTH_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>{t(`workAuth.${v}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("profile.employmentType")}</Label>
            <Select
              value={employmentType || NONE_VALUE}
              onValueChange={(v) =>
                setEmploymentType(v === NONE_VALUE ? "" : v)
              }
            >
              <SelectTrigger aria-label={t("profile.employmentType")}>
                <SelectValue placeholder={t("profile.notSpecified")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>{t("profile.notSpecified")}</SelectItem>
                {EMPLOYMENT_TYPE_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>{t(`jobTypes.${v}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Skills ----------------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.skills")} />
        <div className="mt-3">
          {/* Server-side autocomplete: parent debounces skillQuery into a
              call to SkillsApi.suggest and feeds the results into the
              component. Free-form values are still accepted on Enter. */}
          <TagAutocomplete
            values={skills}
            onChange={setSkills}
            options={skillSuggestions}
            loading={skillsLoading}
            onInputChange={setSkillQuery}
            placeholder={t("profile.skillsPlaceholder")}
          />
        </div>
      </Card>

      {/* Work experience -------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.workExperience")} />
        <ExperiencesEditor values={experiences} onChange={setExperiences} />
      </Card>

      {/* Spoken languages ------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.spokenLanguages")} />
        <div className="mt-3">
          {/* Static autocomplete: filtered locally against the curated
              SPOKEN_LANGUAGES list. Custom values are still accepted on
              Enter so users can add a language we didn't preload. */}
          <TagAutocomplete
            values={spokenLanguages}
            onChange={setSpokenLanguages}
            options={languageSuggestions}
            onInputChange={setLanguageQuery}
            placeholder={t("profile.spokenLanguagesHint")}
            badgeIcon={Languages}
          />
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

/* ===================================================================== *
 *  Work-experience editor + read row
 * ===================================================================== */

/**
 * Local draft shape — strings for everything so the controlled inputs
 * don't have to deal with null vs "" vs undefined edge cases. The
 * submit-time mapping into FormData handles the conversion back to
 * the backend's typed payload.
 */
type WorkExperienceDraft = {
  id?: string;
  title: string;
  companyName: string;
  city: string;
  country: string;
  startDate: string;   // yyyy-MM-dd or ""
  endDate: string;     // yyyy-MM-dd or ""
  isCurrent: boolean;
  description: string;
};

function fromDto(d: WorkExperienceDto): WorkExperienceDraft {
  return {
    id: d.id,
    title: d.title ?? "",
    companyName: d.companyName ?? "",
    city: d.city ?? "",
    country: d.country ?? "",
    startDate: d.startDate ?? "",
    endDate: d.endDate ?? "",
    isCurrent: !!d.isCurrent,
    description: d.description ?? "",
  };
}

function emptyDraft(): WorkExperienceDraft {
  return {
    title: "", companyName: "", city: "", country: "",
    startDate: "", endDate: "", isCurrent: false, description: "",
  };
}

/**
 * Client-side validation mirroring the backend rules. Cheap early-exit
 * before we POST a 50-field FormData that the server would reject anyway.
 * Returns a translated error string, or null when every row is valid.
 */
function validateExperiencesClient(
  list: WorkExperienceDraft[],
  t: (k: string) => string,
): string | null {
  const today = new Date().toISOString().slice(0, 10); // yyyy-MM-dd
  for (const [i, xp] of list.entries()) {
    const where = `#${i + 1}`;
    if (!xp.title.trim()) return `${t("profile.xp.errTitle")} (${where})`;
    if (!xp.companyName.trim()) return `${t("profile.xp.errCompany")} (${where})`;
    if (!xp.startDate) return `${t("profile.xp.errStart")} (${where})`;
    if (xp.startDate > today) return `${t("profile.xp.errStartFuture")} (${where})`;
    if (!xp.isCurrent) {
      if (!xp.endDate) return `${t("profile.xp.errEnd")} (${where})`;
      if (xp.endDate < xp.startDate) return `${t("profile.xp.errEndBefore")} (${where})`;
    }
  }
  return null;
}

/**
 * Read-view row. Two-line layout: title @ company, then dates +
 * location; description rendered as small paragraph beneath when set.
 */
function ExperienceReadRow({ xp }: { xp: WorkExperienceDto }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const range = formatRange(xp.startDate, xp.endDate, xp.isCurrent, locale, t);
  const loc = [xp.city, xp.country].filter(Boolean).join(", ");

  return (
    <li className="flex gap-3">
      <div className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Briefcase className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-base font-semibold leading-tight">
          {xp.title}
        </div>
        <div className="text-sm text-foreground/80">
          {xp.companyName}
          {loc && <span className="text-muted-foreground"> · {loc}</span>}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {range}
        </div>
        {xp.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">
            {xp.description}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Inline-editable list of experience rows. No modal — keeps the form
 * focused, lets the user fix mistakes between rows without losing scroll
 * position. Add button at the bottom; trash icon per row.
 */
function ExperiencesEditor({
  values, onChange,
}: {
  values: WorkExperienceDraft[];
  onChange: (next: WorkExperienceDraft[]) => void;
}) {
  const { t } = useTranslation();

  const update = (i: number, patch: Partial<WorkExperienceDraft>) => {
    const next = values.slice();
    next[i] = { ...next[i], ...patch };
    // isCurrent ↔ endDate invariant — clear endDate when isCurrent flips on
    if (patch.isCurrent === true) next[i].endDate = "";
    onChange(next);
  };

  const remove = (i: number) => onChange(values.filter((_, j) => j !== i));
  const add = () => onChange([...values, emptyDraft()]);

  return (
    <div className="mt-3 space-y-3">
      {values.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          {t("profile.xp.empty")}
        </div>
      )}

      {values.map((xp, i) => (
        <div
          key={xp.id ?? `new-${i}`}
          className="rounded-lg border border-border/60 bg-background p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("profile.xp.rowLabel", { n: i + 1 })}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={t("profile.xp.remove")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("profile.xp.title")}</Label>
              <Input
                value={xp.title}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder={t("profile.xp.titlePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("profile.xp.company")}</Label>
              <Input
                value={xp.companyName}
                onChange={(e) => update(i, { companyName: e.target.value })}
                placeholder={t("profile.xp.companyPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>{t("profile.xp.city")}</Label>
                <Input
                  value={xp.city}
                  onChange={(e) => update(i, { city: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("profile.xp.country")}</Label>
                <Input
                  value={xp.country}
                  onChange={(e) => update(i, { country: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("profile.xp.startDate")}</Label>
              <Input
                type="date"
                value={xp.startDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => update(i, { startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("profile.xp.endDate")}</Label>
              <Input
                type="date"
                value={xp.endDate}
                min={xp.startDate || undefined}
                max={new Date().toISOString().slice(0, 10)}
                disabled={xp.isCurrent}
                onChange={(e) => update(i, { endDate: e.target.value })}
              />
            </div>
            <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={xp.isCurrent}
                onChange={(e) => update(i, { isCurrent: e.target.checked })}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              {t("profile.xp.isCurrent")}
            </label>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("profile.xp.description")}</Label>
              <textarea
                value={xp.description}
                onChange={(e) => update(i, { description: e.target.value })}
                rows={3}
                placeholder={t("profile.xp.descriptionPlaceholder")}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5">
        <Plus className="h-4 w-4" />
        {t("profile.xp.add")}
      </Button>
    </div>
  );
}

/**
 * Render a date range as "Jan 2022 — Jun 2024" or "Jan 2022 — Present"
 * in the user's locale. Falls back to the raw ISO string if Intl can't
 * parse it (defensive — shouldn't happen with backend LocalDate output).
 */
function formatRange(
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
