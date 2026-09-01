import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";

import { CompaniesApi } from "@/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

/**
 * Follow an employer to be told when they post.
 *
 * The value is entirely in the notification, not in the social gesture, so the
 * label says what happens rather than naming the relationship — "Get job alerts"
 * rather than "Follow". Someone deciding whether to click should not have to
 * infer the consequence.
 *
 * Visitors who are not signed in still see the button and are sent to login with
 * a redirect back, rather than having it hidden: a hidden control cannot teach
 * anyone that the feature exists, and this is the reason to make an account.
 */
export function FollowCompanyButton({
  companyId,
  className,
  size = "sm",
}: {
  companyId: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const nav = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const isSeeker = user?.role === "JOB_SEEKER";

  // One request for the whole set rather than one per company, so a grid of
  // company cards does not fan out into a request per card.
  const followed = useQuery({
    queryKey: ["followed-company-ids"],
    queryFn: () => CompaniesApi.followedIds(),
    enabled: isSeeker,
    staleTime: 60_000,
  });

  const following = followed.data?.includes(companyId) ?? false;

  const toggle = useMutation({
    mutationFn: () => CompaniesApi.toggleFollow(companyId),
    onSuccess: (nowFollowing) => {
      toast({
        title: nowFollowing ? t("follow.nowFollowing") : t("follow.unfollowed"),
        description: nowFollowing ? t("follow.nowFollowingHint") : undefined,
        variant: "success",
      });
      void qc.invalidateQueries({ queryKey: ["followed-company-ids"] });
      void qc.invalidateQueries({ queryKey: ["followed-companies"] });
      void qc.invalidateQueries({ queryKey: ["follower-count", companyId] });
    },
    onError: (e) => toast({
      title: t("common.errorOccurred"),
      description: apiErrorMessage(e),
      variant: "destructive",
    }),
  });

  // Recruiters and admins have no use for this; hide rather than disable.
  if (user && !isSeeker) return null;

  const handle = () => {
    if (!user) {
      nav(`/login?redirect=/companies/${companyId}`);
      return;
    }
    toggle.mutate();
  };

  const Icon = following ? BellRing : Bell;

  return (
    <Button
      type="button"
      size={size}
      variant={following ? "outline" : "default"}
      onClick={handle}
      disabled={toggle.isPending}
      className={className}
      aria-pressed={following}
    >
      <Icon className="h-4 w-4" />
      {following ? t("follow.following") : t("follow.follow")}
    </Button>
  );
}
