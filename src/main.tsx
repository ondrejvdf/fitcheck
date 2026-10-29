import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";
const updateSW = registerSW({
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => {
      if (navigator.onLine) registration.update().catch(() => {});
    };
    window.addEventListener("focus", check);
    window.setInterval(check, 60000);
  },
  onNeedRefresh() {
    if (document.querySelector(".update-banner")) return;
    const banner = document.createElement("button");
    banner.className = "update-banner";
    banner.textContent = "Je dostupná nová verze. Klepni pro aktualizaci.";
    banner.onclick = async () => {
      banner.disabled = true;
      banner.textContent = "Aktualizuji aplikaci…";
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const waiting = registration?.waiting;
        if (waiting)
          waiting.addEventListener("statechange", () => {
            if (waiting.state === "activated") window.location.reload();
          });
        await updateSW(true);
        if (!waiting || waiting.state === "activated") window.location.reload();
      } catch {
        banner.disabled = false;
        banner.textContent = "Aktualizace se nezdařila. Zkus to znovu.";
      }
    };
    document.body.append(banner);
  },
  onOfflineReady() {
    console.info("FitCheck je připraven offline.");
  },
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
