import { useEffect } from "react";

import { AppRouter } from "@/router";
import { useAuthStore } from "@/stores/auth";

/**
 * Root app component. On mount we trigger the auth bootstrap which validates
 * any cached session cookie against the backend's /me endpoint. The
 * bootstrap is single-flight and idempotent, so re-running this effect
 * (StrictMode double-invoke, hot reload, etc.) is a no-op.
 */
export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return <AppRouter />;
}
