/**
 * CSRF token state.
 *
 * The backend authenticates with an HttpOnly cookie, so the browser attaches
 * credentials to cross-site requests on its own. It therefore enforces the
 * double-submit cookie pattern: every state-changing request must echo a token
 * back in a header.
 *
 * This module deliberately imports nothing. The token is read by the axios
 * client (`lib/api.ts`) and cleared by the auth store on session transitions,
 * and those two already import each other -- holding the state here keeps them
 * from forming a cycle.
 */

let token: string | null = null;
let headerName = "X-XSRF-TOKEN";

export function getCsrfToken(): string | null {
  return token;
}

export function getCsrfHeaderName(): string {
  return headerName;
}

export function setCsrfToken(value: string | null, header?: string): void {
  token = value;
  if (header) headerName = header;
}

/**
 * Drop the cached token.
 *
 * Call on login and logout: the backend may issue a different token once the
 * session changes, and replaying a stale one costs an extra round trip.
 */
export function invalidateCsrfToken(): void {
  token = null;
}
