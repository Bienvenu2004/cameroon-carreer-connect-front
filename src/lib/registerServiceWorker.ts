/**
 * Register the service worker.
 *
 * Production only. In development the worker would serve stale modules over
 * Vite's HMR and cost more debugging time than it saves.
 *
 * Deliberately silent about failures: a browser with service workers disabled,
 * a private window, or an insecure origin should get an app that simply works
 * without offline support, not a console full of errors about a feature the
 * user never asked for.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is a bonus, never a requirement */
    });
  });
}
