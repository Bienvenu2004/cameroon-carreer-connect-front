import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App";
import { queryClient } from "@/lib/queryClient";
import { i18n } from "@/i18n/config";
import { ToastProvider } from "@/components/ui/toast-provider";
import { initTheme } from "@/stores/theme";
import { GOOGLE_CLIENT_ID } from "@/lib/googleAuth";
import { registerServiceWorker } from "@/lib/registerServiceWorker";
import "./index.css";

initTheme();

// Repeat visits should cost almost nothing on a metered connection, and a
// listing already loaded should survive the connection dropping mid-scroll.
registerServiceWorker();

const tree = (
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </I18nextProvider>
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  // Only mount the Google provider when a client id is configured. Without
  // one the provider would try to load Google's SDK and log errors; instead
  // we render the app plainly and the Google buttons hide themselves.
  GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{tree}</GoogleOAuthProvider>
  ) : (
    tree
  ),
);
