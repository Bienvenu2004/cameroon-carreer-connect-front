import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Briefcase, CheckCircle2 } from "lucide-react";

import { FeedApi } from "@/api";
import { storageUrl } from "@/lib/api";
import { relativeTime } from "@/lib/utils";
import type { ActivityEventDto, ActivityType } from "@/types/api";

/**
 * What employers have been doing.
 *
 * Every entry is derived from data the platform already records — a job posted,
 * an employer verified, a role filled. Nothing here was written by anyone, which
 * is what lets it exist on a platform this young: an authored feed with twelve
 * companies would be empty, and an empty feed is a clearer signal that a site is
 * dead than having no feed at all.
 *
 * The wording lives here rather than on the server because the platform is
 * bilingual; the API sends the facts and this decides how to say them.
 */

const ICONS: Record<ActivityType, typeof Briefcase> = {
  JOB_POSTED: Briefcase,
  COMPANY_VERIFIED: BadgeCheck,
  POSITION_FILLED: CheckCircle2,
};

/** Muted for routine activity, emerald for the two signals worth noticing. */
const TONES: Record<ActivityType, string> = {
  JOB_POSTED: "bg-muted text-muted-foreground",
  COMPANY_VERIFIED: "bg-primary/10 text-primary",
  POSITION_FILLED: "bg-primary/10 text-primary",
};

export function ActivityFeed({
  scope = "platform",
  limit = 8,
  className,
}: {
  /** "following" needs a signed-in seeker; it falls back server-side. */
  scope?: "platform" | "following";
  limit?: number;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";

  const { data, isLoading } = useQuery({
    queryKey: ["activity-feed", scope, limit],
    queryFn: () =>
      scope === "following" ? FeedApi.following(limit) : FeedApi.platform(limit),
    // Activity changes on the order of days here, so re-fetching on every mount
    // would spend a request to learn nothing.
    staleTime: 5 * 60_000,
  });

  const events = data ?? [];

  if (isLoading) {
    return <div className={className}>
      <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
    </div>;
  }

  // Genuinely empty only on a brand-new database. Rendering nothing beats
  // rendering a heading with nothing under it.
  if (events.length === 0) return null;

  return (
    <div className={className}>
      <ul className="space-y-3">
        {events.map((e) => (
          <li key={eventKey(e)} className="flex items-start gap-3">
            <Avatar event={e} />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-foreground/85">
                <Link
                  to={`/companies/${e.companyId}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {e.companyName}
                </Link>{" "}
                {label(e, t)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {relativeTime(e.occurredAt, locale)}
                {e.region ? ` · ${t(`regions.${e.region}`)}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Company logo where there is one, otherwise the event's own icon. */
function Avatar({ event }: { event: ActivityEventDto }) {
  const Icon = ICONS[event.type];

  if (event.companyLogo?.id) {
    return (
      <img
        src={storageUrl(event.companyLogo.id)}
        alt=""
        className="h-9 w-9 shrink-0 rounded-lg object-contain"
      />
    );
  }
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONES[event.type]}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function label(e: ActivityEventDto, t: (k: string, o?: Record<string, unknown>) => string) {
  switch (e.type) {
    case "JOB_POSTED":
      return e.jobId ? (
        <>
          {t("feed.postedAJob")}{" "}
          <Link to={`/jobs/${e.jobId}`} className="font-medium text-primary hover:underline">
            {e.jobTitle}
          </Link>
        </>
      ) : t("feed.postedAJob");
    case "COMPANY_VERIFIED":
      return t("feed.wasVerified");
    case "POSITION_FILLED":
      return e.jobTitle
        ? t("feed.filledNamed", { job: e.jobTitle })
        : t("feed.filled");
    default:
      return null;
  }
}

/**
 * Events have no id of their own — they are derived, not stored — so the key is
 * built from what makes one unique.
 */
function eventKey(e: ActivityEventDto) {
  return `${e.type}:${e.jobId ?? e.companyId}:${e.occurredAt}`;
}
