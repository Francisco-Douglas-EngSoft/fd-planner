/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  __lovableEvents?: {
    track?: (event: string, properties?: Record<string, unknown>) => string | null;
  };
}
