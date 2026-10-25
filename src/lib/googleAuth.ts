import { create } from "zustand";

/**
 * Google Sign-In client id, read from Vite env at build time. Empty when
 * unset — callers use this to decide whether to mount <GoogleOAuthProvider>.
 *
 * This is a public identifier, not a secret: Google's button sends it from the
 * browser on every page view. That is why it lives in the committed
 * `.env.production`, so every build (Cloudflare included) carries it, and why
 * vite.config.ts refuses a production build without it.
 */
export const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? "";

/** True when Google Sign-In is configured for this build. */
export const isGoogleAuthEnabled = (): boolean => GOOGLE_CLIENT_ID.length > 0;

/**
 * Load state of Google's Identity Services script (accounts.google.com/gsi/client).
 *
 * The provider loads it once, asynchronously, at app start. Until it arrives
 * Google's button has nothing to render with, and if it never arrives (a content
 * blocker, a privacy extension, a dropped 2G connection) it renders nothing at
 * all. The auth pages read this so they can hold the button's space while it
 * loads and show a visible, explained fallback when it fails, instead of the
 * button silently not being there.
 */
export type GsiStatus = "loading" | "ready" | "failed";

export const useGsiStatus = create<{ status: GsiStatus }>(() => ({ status: "loading" }));

/** Past this, a script still loading is reported as failed; a late load still wins. */
const GSI_LOAD_TIMEOUT_MS = 15_000;

export function markGsiReady() {
  useGsiStatus.setState({ status: "ready" });
}

export function markGsiFailed() {
  useGsiStatus.setState({ status: "failed" });
}

/** Start the timeout that turns an indefinitely loading script into a visible failure. */
export function watchGsiLoad() {
  window.setTimeout(() => {
    if (useGsiStatus.getState().status === "loading") markGsiFailed();
  }, GSI_LOAD_TIMEOUT_MS);
}
