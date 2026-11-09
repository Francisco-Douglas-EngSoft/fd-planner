# AGENTS.md

- Offline data goes through `src/lib/offline` (window.fetch wrapper installed as the first import in `main.tsx`): Supabase REST reads are cached per user in IndexedDB and writes are queued when offline — why: 180+ direct `supabase.from()` calls get offline support without per-screen rewrites.
- Never add Supabase runtime caching or backgroundSync to the service worker — why: it would cache data across users and replay writes twice alongside the app's own queue.
- Never import the Supabase client statically from `src/lib/offline/install.ts` or `bootstrap.ts` — why: the client must be created after the fetch wrapper is installed.
- Storage usage comes from the `get_my_storage_objects()` RPC (SECURITY INVOKER, so storage RLS limits it to the caller's own folder) and the budget/limit rules live in `src/lib/libraryStorage.ts` — why: one call counts every bucket, including covers in subfolders that `storage.list()` misses.
- PDF/EPUB reading preferences are global per device (`reader:appearance:v1`, `epub:prefs:v2`), not per book or per signed URL — why: signed URLs change on every open, so URL-keyed prefs never persisted.
- Sync conflicts are last-write-wins by `updated_at`; losing local versions are kept in the IndexedDB `conflicts` store — why: nothing the user typed is silently lost.
- The Rotina Diária module is self-contained in `src/rotina/` (pure rules in `calculos.ts`, data access in `api.ts`) with `rotina_`-prefixed tables; other files only register its route/menu — why: it can be removed without touching the rest of the system (see `docs/rotina.md`).
