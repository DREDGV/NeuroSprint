import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { registerSW } from "virtual:pwa-register";
import { App } from "./app/App";
import "./app/styles.css";
import {
  analyticsBeforeSend,
  speedInsightsBeforeSend
} from "./shared/lib/analytics/siteAnalytics";

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
} else if ("serviceWorker" in navigator) {
  // Prevent stale cached chunks from breaking route navigation in local dev.
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <>
      <App />
      <Analytics beforeSend={analyticsBeforeSend} />
      <SpeedInsights beforeSend={speedInsightsBeforeSend} />
    </>
  </React.StrictMode>
);
