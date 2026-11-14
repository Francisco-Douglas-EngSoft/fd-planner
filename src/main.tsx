// Deve ser o primeiro import: liga a camada offline antes do cliente do Supabase existir.
import "./lib/offline/bootstrap";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installAutoSync } from "./lib/offline/syncAll";
import "./index.css";
import { initializeBranding } from "./hooks/useBranding";
import { initializeCustomTheme } from "./hooks/useCustomTheme";
import { installFocusQueueAutoFlush } from "./lib/offlineFocusQueue";
import { registerAppServiceWorker } from "./pwa/registerServiceWorker";
import { preloadInitialRoute } from "./lib/routePreload";
import { getOfflineUserId } from "./lib/offline/offlineUser";

// Baixa já a tela que vai abrir, em paralelo com a verificação do login.
preloadInitialRoute(getOfflineUserId() !== null);

// Monitoramento de erros só é baixado quando configurado (não pesa na abertura).
if (import.meta.env.VITE_SENTRY_DSN) {
  void import("./lib/sentry").then((m) => m.initSentry());
}

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

// Envia a fila de alterações feitas sem internet quando a conexão voltar.
installAutoSync();

createRoot(document.getElementById("root")!).render(<App />);

// Register the PWA service worker (guarded: skips Lovable preview, iframes and dev).
registerAppServiceWorker();
