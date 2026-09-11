import { create } from "zustand";
import { getCookie, removeCookie, setCookie } from "@/lib/cookies";
import { invalidateCsrfToken } from "@/lib/csrf";

export type UserRole = "JOB_SEEKER" | "RECRUITER" | "SYSTEM_ADMIN";

/**
 * Lifecycle of the session as seen from the SPA:
 *
 *   - "unknown"          We have a cached `jcc_user` cookie from a previous
 *                        session but haven't validated it against /me yet.
 *                        ProtectedRoute renders a loading state while we do.
 *   - "authenticated"    /me succeeded (or login just succeeded). The user
 *                        object is trusted.
 *   - "unauthenticated"  No cookie, /me 401, refresh-token failed, or the
 *                        user explicitly logged out.
 */
export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

/**
 * Minimal user shape persisted in the {@code jcc_user} cookie. ALL nested
 * objects here must stay small — the cookie is capped at ~4 KB by the
 * browser, and exceeding that limit causes the assignment to silently
 * no-op (no error thrown). If we ever need a richer field at the top
 * level, fetch it via /me after bootstrap rather than stuffing it here.
 *
 * The full user with skills, experiences, address, etc. lives in memory
 * once {@code bootstrap()} runs and refreshes from /me. The cookie is
 * only used to (a) tell bootstrap "yes, validate the session" instead
 * of fast-pathing to unauthenticated, and (b) render the header avatar
 * during the brief window between page load and /me responding.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
  jobSeekerProfile?: {
    firstName?: string;
    lastName?: string;
    /** Only the URL — never the full FileDto. */
    profilePhoto?: { url?: string } | null;
  } | null;
  recruiterProfile?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    profilePhoto?: { url?: string } | null;
  } | null;
}

/**
 * Project the full {@code UserDto} returned by /me down to the minimal
 * shape the cookie can hold. Anything not listed here is discarded —
 * the cookie's job is to keep the session alive across refresh, not to
 * be a complete user cache.
 *
 * Accepts {@code unknown} because both /me (full UserDto) and
 * loginSession (already-typed AuthUser) feed this. Safe-defaults every
 * field so a malformed input still produces a valid (if sparse) record.
 */
function pickAuthUser(raw: unknown): AuthUser {
  const u = (raw ?? {}) as Record<string, unknown>;
  const seeker = (u.jobSeekerProfile ?? null) as Record<string, unknown> | null;
  const recruiter = (u.recruiterProfile ?? null) as Record<string, unknown> | null;
  const photoUrl = (p: Record<string, unknown> | null): { url?: string } | null => {
    if (!p) return null;
    const photo = p.profilePhoto as { url?: string } | null | undefined;
    return photo?.url ? { url: photo.url } : null;
  };
  return {
    id: String(u.id ?? ""),
    email: String(u.email ?? ""),
    role: (u.role as UserRole) ?? "JOB_SEEKER",
    active: Boolean(u.active),
    jobSeekerProfile: seeker
      ? {
          firstName: seeker.firstName as string | undefined,
          lastName: seeker.lastName as string | undefined,
          profilePhoto: photoUrl(seeker),
        }
      : null,
    recruiterProfile: recruiter
      ? {
          firstName: recruiter.firstName as string | undefined,
          lastName: recruiter.lastName as string | undefined,
          company: recruiter.company as string | undefined,
          profilePhoto: photoUrl(recruiter),
        }
      : null,
  };
}

interface AuthState {
  /** Whether we know if the user is logged in. See AuthStatus for the contract. */
  status: AuthStatus;

  /**
   * Cached user object, hydrated synchronously from the `jcc_user` cookie on
   * first load. Used purely for UI rendering (avatar, name, role-based
   * routing). The actual access/refresh tokens live in HttpOnly cookies
   * managed by the backend — the SPA never sees them.
   */
  user: AuthUser | null;

  setUser: (user: AuthUser | null) => void;

  /**
   * Called after a successful login / register / verify-email flow.
   * `accessToken` and `refreshToken` are ignored — they're already in
   * HttpOnly cookies — but the signature is preserved for backwards
   * compatibility with the auth pages.
   */
  loginSession: (payload: {
    accessToken?: string;
    refreshToken?: string;
    user: AuthUser;
  }) => void;

  /** Clear cached user + flip status to unauthenticated. Idempotent. */
  logout: () => void;

  /**
   * Validate the current cookie-backed session via /me. Idempotent and
   * single-flight: parallel callers receive the same in-flight promise so
   * we never fire /me twice.
   *
   *   - 200 → setUser(response), status = "authenticated"
   *   - 401 (post refresh-token attempt by the API interceptor) → logout(),
   *     status = "unauthenticated"
   *
   * Safe to invoke even when no cached user exists; in that case it
   * short-circuits without hitting the network.
   */
  bootstrap: () => Promise<void>;
}

/* ---------------- cookie key (UI-only, NOT auth) ---------------- */
const USER_COOKIE = "jcc_user";

// Names previously written by the legacy token-tracking logic. Strip them at
// module load so they're not sent on subsequent requests.
const LEGACY_COOKIES = ["jcc_access_token", "jcc_refresh_token"];
LEGACY_COOKIES.forEach((c) => removeCookie(c));

function loadUser(): AuthUser | null {
  const raw = getCookie(USER_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    removeCookie(USER_COOKIE);
    return null;
  }
}

function persistUser(user: AuthUser | null): void {
  if (user) {
    setCookie(USER_COOKIE, JSON.stringify(user), { days: 30 });
  } else {
    removeCookie(USER_COOKIE);
  }
}

/* ---------------- store (hydrated synchronously) ---------------- */

// Read once at module-load time so the first render already has the user.
// Paired with the initial status="unknown", ProtectedRoute will render a
// loading state until /me validates the session — avoids both the "flash
// of login page" on refresh AND showing stale data for a revoked session.
const cachedUser = loadUser();

// Module-level single-flight promise so concurrent bootstrap() callers all
// share the same /me request.
let bootstrapPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: cachedUser ? "unknown" : "unauthenticated",
  user: cachedUser,

  setUser(user) {
    // Project to the minimal shape before storing — UserDto from /me
    // includes the entire profile (skills, experiences, social URLs,
    // file objects) and the JSON serialization easily exceeds the
    // browser's 4 KB cookie cap. When that happens, document.cookie
    // silently no-ops and the next refresh boots us to /login.
    const slim = user ? pickAuthUser(user) : null;
    set({ user: slim, status: slim ? "authenticated" : "unauthenticated" });
    persistUser(slim);
  },

  loginSession({ user }) {
    const slim = pickAuthUser(user);
    // The backend may issue a different CSRF token now the session has changed;
    // drop the cached one so the next mutation fetches a current one.
    invalidateCsrfToken();
    set({ user: slim, status: "authenticated" });
    persistUser(slim);
  },

  logout() {
    invalidateCsrfToken();
    set({ user: null, status: "unauthenticated" });
    persistUser(null);
  },

  async bootstrap() {
    // Already in flight — every caller awaits the same promise.
    if (bootstrapPromise) return bootstrapPromise;

    // Nothing to validate (no prior session, no cached user) — fast-path so
    // we don't fire a guaranteed-401 /me on the home page for anonymous
    // visitors.
    if (get().status === "unauthenticated") {
      return;
    }

    bootstrapPromise = (async () => {
      try {
        // Dynamic import avoids a circular dependency with `@/api`
        // (api/index.ts → lib/api.ts → this store).
        const { UserApi } = await import("@/api");
        const me = await UserApi.me();
        get().setUser(me as AuthUser);
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.info("[auth] bootstrap /me OK → authenticated");
        }
      } catch (err) {
        // /me failed (after the response interceptor already attempted a
        // refresh and that also failed). Force the unauthenticated state
        // even if the interceptor already did it — idempotent.
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn("[auth] bootstrap /me FAILED → logging out", err);
        }
        get().logout();
      } finally {
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  },
}));

/** Kept for backwards compatibility with existing call sites. No-op. */
export function useAuthBootstrap(): void {
  /* hydration is synchronous; runtime validation happens via App.tsx → bootstrap() */
}

/** Selector for the current role; returns null if logged out. */
export function useRole() {
  return useAuthStore((s) => s.user?.role ?? null);
}
