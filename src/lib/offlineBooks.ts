/**
 * Livros disponíveis offline: guarda o arquivo (PDF/EPUB) e a capa no aparelho (IndexedDB).
 */
import { openDB, type IDBPDatabase } from "idb";

interface OfflineBook {
  id: string;
  title: string;
  blob: Blob;
  coverBlob?: Blob | null;
  size: number;
  savedAt: number;
}

export const OFFLINE_BOOKS_CHANGED = "fd:offline-books-changed";

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  dbPromise ??= openDB("fd-offline-books", 1, {
    upgrade(d) {
      d.createObjectStore("books", { keyPath: "id" });
    },
  });
  return dbPromise;
}

const fileUrls = new Map<string, string>();
const coverUrls = new Map<string, string>();

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OFFLINE_BOOKS_CHANGED));
}

async function download(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao baixar o livro");
  return res.blob();
}

export async function saveOfflineBook(params: {
  id: string;
  title: string;
  fileUrl: string;
  coverUrl?: string | null;
}): Promise<void> {
  const blob = await download(params.fileUrl);
  let coverBlob: Blob | null = null;
  if (params.coverUrl) {
    try {
      coverBlob = await download(params.coverUrl);
    } catch {
      coverBlob = null; // a capa é opcional
    }
  }
  const size = blob.size + (coverBlob?.size ?? 0);
  await (await db()).put("books", {
    id: params.id,
    title: params.title,
    blob,
    coverBlob,
    size,
    savedAt: Date.now(),
  } satisfies OfflineBook);
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* noop */
  }
  notify();
}

async function getRecord(id: string): Promise<OfflineBook | undefined> {
  try {
    return (await (await db()).get("books", id)) as OfflineBook | undefined;
  } catch {
    return undefined;
  }
}

export async function getOfflineBookUrl(id: string): Promise<string | null> {
  const known = fileUrls.get(id);
  if (known) return known;
  const rec = await getRecord(id);
  if (!rec) return null;
  const url = URL.createObjectURL(rec.blob);
  fileUrls.set(id, url);
  return url;
}

export async function getOfflineCoverUrl(id: string): Promise<string | null> {
  const known = coverUrls.get(id);
  if (known) return known;
  const rec = await getRecord(id);
  if (!rec?.coverBlob) return null;
  const url = URL.createObjectURL(rec.coverBlob);
  coverUrls.set(id, url);
  return url;
}

export async function isBookOffline(id: string): Promise<boolean> {
  try {
    return !!(await (await db()).getKey("books", id));
  } catch {
    return false;
  }
}

export async function removeOfflineBook(id: string): Promise<void> {
  await (await db()).delete("books", id);
  for (const map of [fileUrls, coverUrls]) {
    const url = map.get(id);
    if (url) URL.revokeObjectURL(url);
    map.delete(id);
  }
  notify();
}

export async function listOfflineBooks(): Promise<{ id: string; title: string; size: number; savedAt: number }[]> {
  try {
    const all = (await (await db()).getAll("books")) as OfflineBook[];
    return all.map(({ id, title, size, savedAt }) => ({ id, title, size, savedAt }));
  } catch {
    return [];
  }
}
