/**
 * Registro do service worker com proteção de contexto.
 *
 * O PWA é registrado APENAS por aqui (vite.config define injectRegister: null),
 * garantindo um único registrador. Nunca deve registrar dentro de um iframe
 * ou em modo de desenvolvimento — service workers são estado persistente no
 * browser e podem continuar servindo HTML/chunks obsoletos após alterações.
 *
 * O Firebase messaging worker (firebase-messaging-sw.js) não é afetado:
 * usa escopo e arquivo separados para push em background.
 */

const APP_SW_URL = "/sw.js";
const BLOCKED_HOSTS: string[] = [];
const BLOCKED_HOST_SUFFIXES: string[] = [];

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;

  // Dentro de um iframe (ambiente de preview) — nunca registrar.
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }

  const { hostname, search } = window.location;

  // Manual kill switch: ?sw=off
  if (new URLSearchParams(search).get("sw") === "off") return true;

  if (hostname.startsWith("id-preview--") || hostname.startsWith("preview--")) {
    return true;
  }
  if (BLOCKED_HOSTS.includes(hostname)) return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return true;
  }

  return false;
}

async function unregisterAppServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => {
        const scriptURL = registration.active?.scriptURL ?? "";
        // Leave the Firebase messaging worker alone.
        if (scriptURL.includes("firebase-messaging-sw")) return Promise.resolve(false);
        // Only evict the app shell worker (or empty/installing ones).
        if (scriptURL.endsWith(APP_SW_URL) || scriptURL === "") {
          return registration.unregister();
        }
        return Promise.resolve(false);
      }),
    );
  } catch {
    /* no-op: best effort cleanup */
  }
}

export function registerAppServiceWorker(): void {
  if (isRefusedContext()) {
    // Ensure any stale app worker from a previous visit is removed.
    void unregisterAppServiceWorker();
    return;
  }

  void import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* no-op: PWA registration unavailable */
    });
}
