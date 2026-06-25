import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { useAuthStore } from "@/stores/auth";

/**
 * Backend wraps every response as { success, message, data }.
 * We unwrap `data` on the client.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

// Dev-mode diagnostic: prints once on startup so you can verify which
// API mode is active. If baseURL is non-empty in dev, you're going
// cross-origin and HttpOnly cookies will be dropped by the browser on
// SameSite=Lax (the JVM cookie default). Fix: blank out
// VITE_API_BASE_URL and restart the dev server so requests ride the
// Vite proxy and the cookie is set same-origin.
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info(
    `[auth] axios baseURL=${baseURL ? `"${baseURL}" (CROSS-ORIGIN — cookies may drop)` : "\"\" (proxy mode — cookies same-origin)"}`,
  );
}

export const api = axios.create({
  baseURL,
  /**
   * Tokens (access_token, refresh_token) live in HttpOnly cookies set by
   * the backend at login time. With withCredentials=true the browser
   * automatically attaches them to every request — meaning the JS layer
   * NEVER has the token in memory and therefore cannot leak a stale one.
   * The backend's TokenResolver reads the cookie at request-time on each
   * request, so every call already uses the freshest token.
   */
  withCredentials: true,
});

/* ---------------- request interceptor: language + client-type ---------------- */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Forward the chosen UI language so the backend's MessageSource can
  // localize error / success messages.
  const lang =
    (typeof window !== "undefined" && localStorage.getItem("lang")) || "fr";
  config.headers["Accept-Language"] = lang;

  // CRITICAL: AuthService.getResponse() only sets HttpOnly access_token /
  // refresh_token cookies when X-Client-Type === "web". With the default
  // "mobile", tokens are returned in the response body and the browser
  // never receives a session cookie — every protected request would 401.
  config.headers["X-Client-Type"] = "web";

  return config;
});

/* =============================================================================
 *  401 handling: single-flight refresh + retry
 * =========================================================================== */

/**
 * Endpoints we must NOT attempt to refresh against. These are the auth-flow
 * endpoints themselves — refreshing on their 401s would either be a no-op
 * or cause an infinite loop. Anything not in this list is considered
 * "authenticated business logic" and will trigger a refresh-then-retry on 401.
 */
const NO_REFRESH_PATHS = [
  "/api/hjp/auth/login",
  "/api/hjp/auth/register",
  "/api/hjp/auth/request-email-verification",
  "/api/hjp/auth/verify-email",
  "/api/hjp/auth/resend-verification",
  "/api/hjp/auth/forgot-password",
  "/api/hjp/auth/reset-password",
  "/api/hjp/auth/refresh-token",
  "/api/hjp/auth/logout",
  "/api/hjp/auth/verify-device",
  "/api/hjp/auth/request-device-verification",
];

function isAuthFlowRequest(url?: string): boolean {
  if (!url) return false;
  return NO_REFRESH_PATHS.some((p) => url.includes(p));
}

/**
 * Single-flight refresh promise. While a refresh is in progress, every other
 * 401'd request awaits this same promise instead of firing its own
 * /refresh-token call — preventing thundering-herd refresh attempts.
 *
 * The promise resolves to `true` on success and `false` on failure.
 */
let refreshInflight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshInflight) return refreshInflight;

  refreshInflight = (async () => {
    try {
      // The browser sends the refresh_token HttpOnly cookie automatically;
      // we send an empty body. On success the backend rotates the cookies.
      await api.post("/api/hjp/auth/refresh-token", {});
      return true;
    } catch {
      return false;
    } finally {
      // Reset on the next microtask so any 401'd request that arrived
      // mid-flight still sees the same promise.
      queueMicrotask(() => {
        refreshInflight = null;
      });
    }
  })();

  return refreshInflight;
}

/**
 * Hard-clear local auth state and navigate to /login. We use a window
 * redirect (rather than React Router's `useNavigate`) because this runs
 * outside a component context.
 */
function forceLogout(): void {
  const { logout } = useAuthStore.getState();
  logout();
  // Don't bounce the user away from public pages — ProtectedRoute already
  // redirects when status flips to "unauthenticated". For the rare case
  // where a 401 fires from a public page we just clear state silently.
  // (No window.location.replace here — that would interrupt an anonymous
  // visitor browsing the home page just because /me happened to 401.)
}

/* ---------------- response interceptor ---------------- */
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (error.response?.status !== 401 || !original) {
      return Promise.reject(error);
    }

    // Auth-flow endpoints handle their own 401s (bad credentials, expired
    // refresh token, etc.). Don't try to refresh on top of them.
    if (isAuthFlowRequest(original.url)) {
      // If the refresh-token endpoint itself returned 401, the session is
      // truly gone — clear state so ProtectedRoute redirects.
      if (original.url?.includes("/api/hjp/auth/refresh-token")) {
        forceLogout();
      }
      return Promise.reject(error);
    }

    // Already retried this exact request once; don't loop.
    if (original._retry) {
      forceLogout();
      return Promise.reject(error);
    }

    const refreshed = await refreshSession();
    if (!refreshed) {
      forceLogout();
      return Promise.reject(error);
    }

    // Replay the original request. The browser will now attach the
    // freshly-rotated HttpOnly cookies set by the backend.
    original._retry = true;
    return api(original);
  }
);

/** Unwrap the API envelope. Use as `unwrap(api.get(...))`. */
export async function unwrap<T>(p: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const r = await p;
  return r.data.data;
}

/** Extract a user-friendly error message from a thrown axios error. */
export function apiErrorMessage(e: unknown, fallback = "Something went wrong"): string {
  const ax = e as AxiosError<ApiEnvelope<unknown>>;
  return ax?.response?.data?.message || ax?.message || fallback;
}
