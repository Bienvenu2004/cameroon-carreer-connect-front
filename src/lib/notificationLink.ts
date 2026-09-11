import type { NotificationDto, UserRole } from "@/types/api";

/**
 * Where a notification should take its reader.
 *
 * The backend records what each notification is about as a related entity
 * (see NotificationFactoryServiceImpl):
 *   - JOB          an invitation to apply, a new job at a followed company, or
 *                  the outcome of a report -- all about a specific offer;
 *   - APPLICATION  a new application (sent to the recruiter) or a status change
 *                  (sent to the candidate) -- the same entity seen from two
 *                  sides, so the destination depends on who is reading;
 *   - USER         account events: welcome, password reset, new sign-in.
 *
 * Returns null when there is nowhere meaningful to go, so the caller can simply
 * mark the notification as read rather than navigate to a guess.
 */
export function notificationLink(
  notification: Pick<NotificationDto, "relatedEntityType" | "relatedEntityId">,
  role: UserRole,
): string | null {
  const type = notification.relatedEntityType?.toUpperCase();
  const id = notification.relatedEntityId;

  switch (type) {
    case "JOB":
      return id ? `/jobs/${encodeURIComponent(id)}` : null;

    case "APPLICATION": {
      if (!id) return null;
      const query = `?application=${encodeURIComponent(id)}`;
      if (role === "RECRUITER") return `/recruiter/applications${query}`;
      if (role === "JOB_SEEKER") return `/seeker/applications${query}`;
      return null;
    }

    case "USER":
      if (role === "RECRUITER") return "/recruiter/profile";
      if (role === "JOB_SEEKER") return "/seeker/profile";
      if (role === "SYSTEM_ADMIN") return "/admin";
      return null;

    default:
      return null;
  }
}
