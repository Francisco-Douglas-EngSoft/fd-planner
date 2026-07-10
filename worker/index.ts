/**
 * Cloudflare Worker entry-point.
 *
 * Serves the built SPA from the static-assets binding (ASSETS) and gives the
 * Worker real runtime code. Having a script (this file) is what unlocks the
 * "Variables and secrets" panel in the Cloudflare dashboard — a Worker that
 * only has static assets cannot store runtime variables/secrets.
 *
 * Any secret you add in the dashboard is available here via `env.<NAME>`.
 * Sensitive server-only secrets (e.g. FIREBASE_PRIVATE_KEY, SERVICE_ROLE_KEY)
 * are safe here because this code runs on Cloudflare's edge, never in the
 * browser bundle.
 */

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Delegate everything to the static-assets handler.
    // SPA fallback (index.html for unknown routes) is configured in wrangler.toml
    // via [assets] not_found_handling = "single-page-application".
    return env.ASSETS.fetch(request);
  },
};
