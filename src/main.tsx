import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeBranding } from "./hooks/useBranding";
import { initializeCustomTheme } from "./hooks/useCustomTheme";
import { installFocusQueueAutoFlush } from "./lib/offlineFocusQueue";
import { registerAppServiceWorker } from "./pwa/registerServiceWorker";
import { initSentry } from "./lib/sentry";

// Initialize Sentry before anything else so early errors are captured.
initSentry();

// Initialize theme classes before React mounts to prevent flash
(() => {
  const theme = localStorage.getItem('fdplanner-theme') || 'dark';
  const lightVariant = localStorage.getItem('fdplanner-light-variant') || 'crystal';
  const darkVariant = localStorage.getItem('fdplanner-dark-variant') || 'graphite';
  
  const root = document.documentElement;
  root.classList.add(theme);
  root.classList.add(theme === 'dark' ? `dark-${darkVariant}` : `light-${lightVariant}`);
  
  // Initialize custom theme if active (must be after base theme classes)
  initializeCustomTheme();
})();

// Initialize branding (document title)
initializeBranding();

// Install offline-first queue for focus sessions: replays any pending
// sessions saved locally when the network was down or the tab closed.
installFocusQueueAutoFlush();

createRoot(document.getElementById("root")!).render(<App />);

// Register the PWA service worker (guarded: skips Lovable preview, iframes and dev).
registerAppServiceWorker();
