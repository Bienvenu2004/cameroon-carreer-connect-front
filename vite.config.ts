/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8080";

  /**
   * Proxy config for /api, /storage, and the STOMP websocket.
   *
   *   - changeOrigin rewrites the outgoing Host header so the backend
   *     accepts the request.
   *   - cookieDomainRewrite + cookiePathRewrite strip/normalize the
   *     attributes the backend may attach to Set-Cookie. Without these,
   *     http-proxy passes the cookie through verbatim; if the backend
   *     ever adds Domain=localhost:8080, the browser would reject it as
   *     coming from a different host than the SPA (localhost:5173).
   *     Forcing Domain="" and Path="/" makes the cookie scope to the
   *     SPA's own origin reliably.
   */
  const apiProxy = {
    target: proxyTarget,
    changeOrigin: true,
    cookieDomainRewrite: "",
    cookiePathRewrite: "/",
  } as const;

  return {
    plugins: [react()],
    test: {
      environment: "jsdom",
      globals: true,
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      coverage: { reporter: ["text", "html"], reportsDirectory: "coverage" },
    },
    build: {
      rollupOptions: {
        output: {
          /**
           * Split the shared third-party libraries out of the entry chunk.
           *
           * Routes are already code-split (see router.tsx), but without this the
           * vendor code they share is hoisted back into one entry chunk and the
           * split buys nothing. Recharts in particular is only ever needed by the
           * three dashboards, so it has no business in the payload an anonymous
           * visitor downloads to read a job advert.
           *
           * These chunks are also long-lived: they only change when a dependency
           * is upgraded, so returning visitors keep them cached across deploys.
           *
           * Recharts is deliberately NOT listed. Naming a library here makes its
           * chunk part of the initial graph, so a manual `vendor-charts` entry got
           * modulepreloaded on the home page -- 410 kB for a visitor who will never
           * open a dashboard. Left alone, Rollup keeps it inside the async chunks of
           * the only two pages that import it, which is exactly what we want.
           *
           * react-hook-form and zod are also not listed: Rollup folds them
           * into vendor-react anyway (they share its dependency graph), and naming
           * them here only produced an empty 36-byte chunk and an extra request.
           */
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-i18n": ["i18next", "react-i18next", "i18next-browser-languagedetector"],
            "vendor-query": ["@tanstack/react-query", "axios"],
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": apiProxy,
        "/storage": apiProxy,
        "/retms-websocket": { ...apiProxy, ws: true },
      },
    },
  };
});
