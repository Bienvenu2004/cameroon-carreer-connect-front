/**
 * Where the API lives, as a value axios and SockJS can both use.
 *
 * `VITE_API_PROXY_TARGET` is empty in proxy mode (the Vite dev server, and any
 * deployment that serves the SPA and the API from one origin) and an absolute
 * origin when the API is elsewhere.
 *
 * The scheme is not optional, and leaving it out fails silently rather than
 * loudly: axios treats `api.example.com` as a *relative path*, so a login POST
 * goes to `https://<the-spa>/api.example.com/api/hjp/auth/login` and the static
 * host answers 405. Nothing in the request looks wrong until you read the URL
 * character by character. A deployment platform's variable field invites a bare
 * hostname -- that is how the value is displayed everywhere else -- so the
 * scheme is restored here instead of being demanded of whoever types it.
 *
 * https is assumed because a scheme-less host cannot be a local backend: the dev
 * proxy is reached by leaving this blank.
 */
export function resolveApiBase(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!value) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}
