import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import "./i18n";
import App from "./App.tsx";

// registerType: 'autoUpdate' (vite.config.ts) makes this silently activate
// and reload as soon as a new deploy is detected, instead of only picking
// it up the next time every tab/window for the site happens to be fully
// closed and reopened. The hourly `registration.update()` check matters
// for an installed PWA that stays open for days — otherwise it would only
// re-check on a fresh navigation.
registerSW({
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
