/**
 * Tiny cookie helpers used exclusively for non-sensitive, UI-only state
 * (currently just `jcc_user` — the cached user object for avatar/name
 * rendering and role-based routing).
 *
 * Authentication tokens (access_token / refresh_token) are HttpOnly cookies
 * set by the backend and NEVER touched from JavaScript. The browser
 * attaches them automatically thanks to `withCredentials: true` on the
 * axios client. SameSite=Lax + Secure (on HTTPS) protects against the
 * common CSRF vectors.
 */

const isBrowser = typeof document !== "undefined";

export interface CookieOptions {
  /** Cookie lifetime in days. Default 7. */
  days?: number;
  /** Path scope, default "/". */
  path?: string;
  /** SameSite policy. Default "Lax". */
  sameSite?: "Lax" | "Strict" | "None";
  /** Add the Secure flag (HTTPS-only). Auto-true when window.location.protocol === "https:". */
  secure?: boolean;
}

export function setCookie(name: string, value: string, opts: CookieOptions = {}): void {
  if (!isBrowser) return;
  const days = opts.days ?? 7;
  const path = opts.path ?? "/";
  const sameSite = opts.sameSite ?? "Lax";
  const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
  const secure = opts.secure ?? (typeof window !== "undefined" && window.location.protocol === "https:");

  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `expires=${expires}`,
    `path=${path}`,
    `SameSite=${sameSite}`,
  ];
  if (secure) parts.push("Secure");
  document.cookie = parts.join("; ");
}

export function getCookie(name: string): string | null {
  if (!isBrowser) return null;
  const re = new RegExp("(?:^|;\\s*)" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)");
  const match = document.cookie.match(re);
  return match ? decodeURIComponent(match[1]) : null;
}

export function removeCookie(name: string, path = "/"): void {
  if (!isBrowser) return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=Lax`;
}
