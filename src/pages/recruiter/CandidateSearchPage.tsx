import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Info, MapPin, Search, Send, ShieldCheck, Sparkles } from "lucide-react";

import { CandidatesApi, JobsApi, SkillsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/common/Pagination";
import { TagAutocomplete } from "@/components/common/TagAutocomplete";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage, storageUrl } from "@/lib/api";
import {
  ALL_DIPLOMA_LEVELS, ALL_REGIONS,
  type CandidateSummaryDto, type DiplomaLevel, type Region,
} from "@/types/api";

const ANY = "__any__";
const PAGE_SIZE = 12;

/**
 * Recruiter-facing candidate search.
 *
 * This is the feature that changes what the platform is. Until it existed a
 * recruiter's world was the list of people who had applied to them, with no
 * route to anyone else — which is a job board. Being able to go and find someone
 * is what makes it a recruitment platform.
 *
 * Two things are deliberately absent from this screen, and both are the point:
 * there is no search by name, and no contact details anywhere in a result. The
 * pool is people who chose to be findable by employers, not a directory of
 * everyone who signed up, and the way to reach one of them is an invitation they
 * are free to ignore.
 */
export function CandidateSearchPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [keyword, setKeyword] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [region, setRegion] = useState<Region | typeof ANY>(ANY);
  const [diploma, setDiploma] = useState<DiplomaLevel | typeof ANY>(ANY);
  const [language, setLanguage] = useState("");
  const [activeWithin, setActiveWithin] = useState<string>(ANY);
  const [page, setPage] = useState(0);

  const [inviting, setInviting] = useState<CandidateSummaryDto | null>(null);
  const [inviteJobId, setInviteJobId] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  const params = useMemo(() => ({
    keyword: keyword.trim() || undefined,
    skills: skills.length ? skills : undefined,
    region: region === ANY ? undefined : region,
    minimumDiploma: diploma === ANY ? undefined : diploma,
    language: language.trim() || undefined,
    activeWithinDays: activeWithin === ANY ? undefined : Number(activeWithin),
    page,
    size: PAGE_SIZE,
  }), [keyword, skills, region, diploma, language, activeWithin, page]);

  const [skillQuery, setSkillQuery] = useState("");
  const skillOptions = useQuery({
    queryKey: ["skill-suggest", skillQuery],
    queryFn: () => SkillsApi.suggest(skillQuery),
    enabled: skillQuery.trim().length > 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["candidates", params],
    queryFn: () => CandidatesApi.search(params),
  });

  /** Only the recruiter's own open postings can be invited to. */
  const myJobs = useQuery({
    queryKey: ["my-jobs", "open-for-invite"],
    queryFn: () => JobsApi.myList({ page: 0, size: 50, isActive: true }),
  });

  const openJobs = myJobs.data?.content ?? [];

  const invite = useMutation({
    mutationFn: () => CandidatesApi.invite({
      profileId: inviting!.profileId,
      jobId: inviteJobId,
      message: inviteMessage.trim() || undefined,
    }),
    onSuccess: (sent) => {
      toast({
        title: sent ? t("candidates.invited") : t("candidates.alreadyInvited"),
        variant: sent ? "success" : "default",
      });
      closeInvite();
      void qc.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (e) => toast({
      title: t("common.errorOccurred"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  function openInvite(candidate: CandidateSummaryDto) {
    setInviting(candidate);
    setInviteJobId(openJobs[0]?.id ?? "");
    setInviteMessage("");
  }

  function closeInvite() {
    setInviting(null);
    setInviteJobId("");
    setInviteMessage("");
  }

  function resetPageAnd(fn: () => void) {
    fn();
    setPage(0);
  }

  const results = data?.content ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("candidates.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("candidates.subtitle")}</p>
      </header>

      {/* The consent model is explained where recruiters will actually read it,
          rather than buried in terms nobody opens. */}
      <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("candidates.privacyNote")}
        </p>
      </div>

      <div className="mb-6 space-y-4 rounded-xl border border-border/60 bg-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => resetPageAnd(() => setKeyword(e.target.value))}
            placeholder={t("candidates.search")}
            className="pl-9"
          />
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">{t("candidates.skills")}</Label>
          <TagAutocomplete
            values={skills}
            onChange={(v) => resetPageAnd(() => setSkills(v))}
            options={skillOptions.data ?? []}
            loading={skillOptions.isFetching}
            onInputChange={setSkillQuery}
          />
          <p className="mt-1 text-xs text-muted-foreground">{t("candidates.skillsHint")}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("jobs.region")}</Label>
            <Select value={region} onValueChange={(v) => resetPageAnd(() => setRegion(v as Region | typeof ANY))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("jobs.allRegions")}</SelectItem>
                {ALL_REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{t(`regions.${r}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("candidates.minimumDiploma")}</Label>
            <Select value={diploma} onValueChange={(v) => resetPageAnd(() => setDiploma(v as DiplomaLevel | typeof ANY))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("jobs.anyDiploma")}</SelectItem>
                {ALL_DIPLOMA_LEVELS.map((d) => (
                  <SelectItem key={d} value={d}>{t(`diplomas.${d}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("candidates.language")}</Label>
            <Input
              value={language}
              onChange={(e) => resetPageAnd(() => setLanguage(e.target.value))}
              placeholder="Français"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("candidates.activeWithin")}</Label>
            <Select value={activeWithin} onValueChange={(v) => resetPageAnd(() => setActiveWithin(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("candidates.anyTime")}</SelectItem>
                <SelectItem value="30">{t("candidates.last30d")}</SelectItem>
                <SelectItem value="90">{t("candidates.last90d")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}

      {!isLoading && results.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/70 px-6 py-12 text-center">
          <p className="font-medium text-foreground">{t("candidates.none")}</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            {t("candidates.noneHint")}
          </p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {t("candidates.results", { count: data?.totalElements ?? results.length })}
          </p>

          <ul className="grid gap-3 sm:grid-cols-2">
            {results.map((c) => (
              <li key={c.profileId} className="rounded-xl border border-border/60 bg-card p-4 elev-1">
                <div className="flex items-start gap-3">
                  {c.profilePhoto?.id ? (
                    <img
                      src={storageUrl(c.profilePhoto.id)}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                      {(c.firstName ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold text-foreground">
                      {c.firstName} {c.lastNameInitial}
                    </div>
                    {c.currentTitle && (
                      <div className="truncate text-sm text-foreground/70">{c.currentTitle}</div>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {(c.city || c.region) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {c.city}{c.city && c.region ? ", " : ""}
                          {c.region ? t(`regions.${c.region}`) : ""}
                        </span>
                      )}
                      {c.highestDiploma && (
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {t(`diplomas.${c.highestDiploma}`)}
                          {c.fieldOfStudy ? ` · ${c.fieldOfStudy}` : ""}
                        </span>
                      )}
                      {c.totalYearsOfExperience != null && c.totalYearsOfExperience > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {t("candidates.yearsExperience", { count: c.totalYearsOfExperience })}
                        </span>
                      )}
                    </div>

                    {c.topSkills && c.topSkills.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {c.topSkills.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[11px]">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => openInvite(c)}>
                    <Send className="h-3.5 w-3.5" /> {t("candidates.invite")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 1}
            isLast={data?.isLast ?? true}
            totalElements={data?.totalElements ?? 0}
            onChange={setPage}
          />
        </>
      )}

      <Dialog open={!!inviting} onOpenChange={(o) => !o && closeInvite()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("candidates.invite")} — {inviting?.firstName} {inviting?.lastNameInitial}
            </DialogTitle>
          </DialogHeader>

          {openJobs.length === 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              {t("candidates.noOpenJobs")}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("candidates.inviteFor")}</Label>
                <Select value={inviteJobId} onValueChange={setInviteJobId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {openJobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("candidates.inviteMessage")}</Label>
                <Textarea
                  rows={3}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={closeInvite}>{t("common.cancel")}</Button>
            <Button
              disabled={!inviteJobId || invite.isPending}
              onClick={() => invite.mutate()}
            >
              <Send className="h-4 w-4" /> {t("candidates.inviteSend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
