import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API + storage to the Spring Boot backend during dev so we
      // avoid CORS issues. Adjust target to match your backend port.
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
      "/storage": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
      "/retms-websocket": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
