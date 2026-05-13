import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import type { UserRole } from "@/types/api";

/**
 * Route guard for authenticated pages.
 *
 *   - status "unknown"          → show a loading spinner while /me validates.
 *                                 We deliberately DO NOT redirect here so a
 *                                 user who refreshes a protected page with
 *                                 a valid session doesn't briefly land on
 *                                 /login.
 *   - status "unauthenticated"  → redirect to /login, remembering the page
 *                                 the user wanted so we can send them back
 *                                 after a successful login.
 *   - status "authenticated"    → render children, plus an optional role
 *                                 allow-list check.
 */
export function ProtectedRoute({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow?: UserRole[];
}) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const loc = useLocation();

  if (status === "unknown") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  if (allow && !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
