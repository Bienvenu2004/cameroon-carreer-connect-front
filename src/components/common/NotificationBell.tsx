import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";

import { NotificationsApi } from "@/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";
import { relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { NotificationDto } from "@/types/api";

/**
 * Notification bell — small icon in the header with an unread-count badge
 * and a dropdown listing the user's recent notifications.
 *
 * Data flow:
 *   - Two React Query hooks: the unread count (polled every 30 s) and the
 *     latest 10 notifications (lazy: only fetched when the dropdown opens
 *     for the first time, then kept in cache).
 *   - `enabled: !!user` so we don't pester /notifications endpoints for
 *     anonymous visitors.
 *   - Clicking a notification marks it as read; the unread badge updates
 *     on the next poll (or sooner if we invalidate the queries — we do).
 *
 * Why polling not WebSocket: this is the "Item 2a" easy version. STOMP
 * wiring already exists on the backend (`/retms-websocket`) but plugging
 * a real-time subscriber on top of the JWT cookie auth + reconnect logic
 * is its own feature. Polling is good enough for now and trivially
 * scalable for hundreds of concurrent users.
 */
const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  /* --------- unread count: cheap COUNT, polled --------- */
  const unread = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => NotificationsApi.unreadCount(),
    enabled: !!user,
    refetchInterval: POLL_INTERVAL_MS,
    // Pause when the tab is hidden so we don't burn quota in a background
    // tab. React Query already handles this for refetchOnWindowFocus.
    refetchIntervalInBackground: false,
  });

  /* --------- recent notifications: fetched once on open --------- */
  const list = useQuery({
    queryKey: ["notifications", "list", 10],
    queryFn: () => NotificationsApi.list(0, 10),
    enabled: !!user,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  /* --------- mutations --------- */
  const markOne = useMutation({
    mutationFn: (id: string) => NotificationsApi.markAsRead(id),
    onSuccess: () => {
      // Invalidate both queries — count and list — so the unread badge and
      // the dropdown content both reflect the read state immediately
      // instead of waiting for the next poll tick.
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => NotificationsApi.markAllAsRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (!user) return null;

  const count = unread.data?.count ?? 0;
  const items = list.data?.content ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("notifications.title")}
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <>
              <span
                className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
                aria-hidden
              >
                {count > 99 ? "99+" : count}
              </span>
              <span className="sr-only">
                {t("notifications.unreadCountSr", { count })}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header with title + "mark all as read" action --------------- */}
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <span className="text-sm font-medium">{t("notifications.title")}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-xs"
            disabled={count === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="mr-1 h-3 w-3" />
            {t("notifications.markAllAsRead")}
          </Button>
        </div>

        {/* Body: empty state, loading state, or list -------------------- */}
        <div className="max-h-96 overflow-y-auto">
          {list.isLoading ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              {t("notifications.empty")}
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {items.map((n) => (
                <li key={n.id}>
                  <NotificationRow
                    notification={n}
                    locale={locale}
                    onClick={() => {
                      if (!n.read) markOne.mutate(n.id);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ----------------------------- row ------------------------------------ */

function NotificationRow({
  notification,
  locale,
  onClick,
}: {
  notification: NotificationDto;
  locale: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full px-3 py-2 text-left transition-colors hover:bg-accent/50",
        // Subtle visual cue for unread: tiny dot + bolder text. Read rows
        // fade slightly so the eye is drawn to what's new.
        !notification.read && "bg-primary/[0.04]"
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
            notification.read ? "bg-transparent" : "bg-primary"
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm leading-snug text-foreground",
              !notification.read && "font-medium"
            )}
          >
            {notification.message}
          </p>
          {notification.createdAt && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {relativeTime(notification.createdAt, locale)}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
