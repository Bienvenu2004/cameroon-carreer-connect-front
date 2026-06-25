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
        "/hjp-websocket": { ...apiProxy, ws: true },
      },
    },
  };
});
