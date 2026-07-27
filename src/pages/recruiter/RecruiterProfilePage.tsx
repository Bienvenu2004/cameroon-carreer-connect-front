import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Mail, MapPin, Pencil, Upload, User as UserIcon, X,
} from "lucide-react";

import { RecruiterApi } from "@/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { useAuthStore } from "@/stores/auth";
import { apiErrorMessage } from "@/lib/api";
import { initials } from "@/lib/utils";
import type { RecruiterProfileDto } from "@/types/api";

/* ============================================================================
 *  Recruiter Profile page
 *
 *  Mirrors the job-seeker profile page (view + edit modes) but for the fields
 *  the recruiter model carries: name, company, and location. Edit mode submits
 *  a multipart PATCH matching RecruiterProfileUpsertDto (firstName, lastName,
 *  city, state, country, company, profilePhoto). On success we invalidate the
 *  cached profile and the auth `me` query (the header avatar reads from it) and
 *  drop back to view mode.
 * ==========================================================================*/
export function RecruiterProfilePage() {
  const { t } = useTranslation();
  const profileQuery = useQuery({
    queryKey: ["recruiter-profile"],
    queryFn: () => RecruiterApi.me(),
  });

  const [editing, setEditing] = useState(false);

  if (profileQuery.isLoading) {
    return <div className="text-muted-foreground">{t("common.loading")}</div>;
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
            {t("recruiterProfile.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("recruiterProfile.subtitle")}
          </p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> {t("profile.editProfile")}
          </Button>
        )}
      </header>

      {editing ? (
        <RecruiterProfileEditForm
          profile={profile}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      ) : (
        <RecruiterProfileView profile={profile} />
      )}
    </div>
  );
}

/* ============================================================================
 *  View mode
 * ==========================================================================*/
function RecruiterProfileView({ profile }: { profile: RecruiterProfileDto }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");

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
            {profile.company && (
              <div className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" /> {profile.company}
              </div>
            )}
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

      {/* Company ----------------------------------------------------------- */}
      <Section title={t("recruiterProfile.companySection")}>
        <Field icon={Building2} label={t("recruiterProfile.company")} value={profile.company} />
      </Section>

      {/* Address ----------------------------------------------------------- */}
      <Section title={t("profile.addressSection")}>
        <Field icon={MapPin} label={t("profile.city")} value={profile.city} />
        <Field label={t("recruiterProfile.state")} value={profile.state} />
        <Field label={t("profile.country")} value={profile.country} />
      </Section>
    </div>
  );
}

/* ============================================================================
 *  Edit mode
 * ==========================================================================*/
function RecruiterProfileEditForm({
  profile,
  onCancel,
  onSaved,
}: {
  profile: RecruiterProfileDto;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState(profile.firstName ?? "");
  const [lastName, setLastName] = useState(profile.lastName ?? "");
  const [company, setCompany] = useState(profile.company ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [state, setState] = useState(profile.state ?? "");
  const [country, setCountry] = useState(profile.country ?? "Cameroon");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoPreviewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile],
  );
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const save = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      // Send every field (empty string clears the value on the backend).
      fd.append("firstName", firstName.trim());
      fd.append("lastName", lastName.trim());
      fd.append("company", company.trim());
      fd.append("city", city.trim());
      fd.append("state", state.trim());
      fd.append("country", country.trim());
      if (photoFile) fd.append("profilePhoto", photoFile);
      return RecruiterApi.update(fd);
    },
    onSuccess: () => {
      toast({ title: t("common.successSaved"), variant: "success" });
      void qc.invalidateQueries({ queryKey: ["recruiter-profile"] });
      // The header avatar/name/role come from the Zustand auth store, which is
      // hydrated from /me. Re-run bootstrap so the new photo/name/company show
      // up in the top bar without a full page reload.
      void useAuthStore.getState().bootstrap();
      onSaved();
    },
    onError: (e) =>
      toast({
        title: t("common.errorOccurred"),
        description: apiErrorMessage(e),
        variant: "destructive",
      }),
  });

  const currentPhotoSrc = photoPreviewUrl ?? profile.profilePhoto?.url ?? undefined;

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
            {currentPhotoSrc && <AvatarImage src={currentPhotoSrc} alt="preview" />}
            <AvatarFallback>
              <UserIcon className="h-8 w-8 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm hover:bg-accent">
              <Upload className="h-4 w-4 text-primary" />
              <span>{photoFile?.name ?? t("profile.uploadPhoto")}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {photoFile && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoFile(null)}>
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
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("profile.lastName")}</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Company ---------------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("recruiterProfile.companySection")} />
        <div className="mt-3 space-y-2">
          <Label>{t("recruiterProfile.company")}</Label>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder={t("recruiterProfile.companyPlaceholder")}
          />
        </div>
      </Card>

      {/* Address ---------------------------------------------------------- */}
      <Card>
        <SectionHeader title={t("profile.addressSection")} />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("profile.city")}</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("recruiterProfile.state")}</Label>
            <Input value={state} onChange={(e) => setState(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("profile.country")}</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Actions ---------------------------------------------------------- */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={save.isPending}>
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
 *  Layout helpers
 * ==========================================================================*/
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 elev-1">{children}</div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
  icon?: typeof MapPin;
  label: string;
  value?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-border/40 bg-card p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
        {value && value.trim().length > 0 ? (
          <span className="truncate">{value}</span>
        ) : (
          <span className="text-muted-foreground italic">{t("profile.notSet")}</span>
        )}
      </div>
    </div>
  );
}
