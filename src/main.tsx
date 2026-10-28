import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import "./i18n";
import App from "./App.tsx";
import { setNeedsRefresh } from "./lib/appUpdate";

// registerType: 'prompt' (vite.config.ts) means a new worker installs and
// waits instead of activating itself — onNeedRefresh fires once that's
// happened, and UpdateBanner (shown from App.tsx) is what calls `updateSW`
// (captured here) to actually apply it, instead of silently reloading
// mid-session on its own. The hourly `registration.update()` check matters
// for an installed PWA that stays open for days — otherwise it would only
// re-check on a fresh navigation.
const updateSW = registerSW({
  onNeedRefresh() {
    setNeedsRefresh(updateSW);
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    setInterval(() => void registration.update(), 60 * 60 * 1000);
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
