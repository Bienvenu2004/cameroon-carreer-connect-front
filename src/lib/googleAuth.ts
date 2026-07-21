/**
 * Google Sign-In client id, read from Vite env at build time. Empty when
 * unset — callers use this to decide whether to render the Google buttons and
 * whether to mount <GoogleOAuthProvider>.
 */
export const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? "";

/** True when Google Sign-In is configured for this build. */
export const isGoogleAuthEnabled = (): boolean => GOOGLE_CLIENT_ID.length > 0;
