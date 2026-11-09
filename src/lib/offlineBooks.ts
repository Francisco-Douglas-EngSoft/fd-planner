/**
 * Livros disponíveis offline: guarda o arquivo (PDF/EPUB) no aparelho (IndexedDB).
 */
import { openDB, type IDBPDatabase } from "idb";

interface OfflineBook {
  id: string;
  title: string;
  blob: Blob;
  size: number;
  savedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  dbPromise ??= openDB("fd-offline-books", 1, {
    upgrade(d) {
      d.createObjectStore("books", { keyPath: "id" });
    },
  });
  return dbPromise;
}

export async function saveOfflineBook(id: string, title: string, url: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao baixar o livro");
  const blob = await res.blob();
  await (await db()).put("books", { id, title, blob, size: blob.size, savedAt: Date.now() } satisfies OfflineBook);
  try { await navigator.storage?.persist?.(); } catch { /* noop */ }
}

export async function getOfflineBookUrl(id: string): Promise<string | null> {
  try {
    const rec = (await (await db()).get("books", id)) as OfflineBook | undefined;
    return rec ? URL.createObjectURL(rec.blob) : null;
  } catch {
    return null;
  }
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
}

export async function listOfflineBooks(): Promise<{ id: string; title: string; size: number }[]> {
  const all = (await (await db()).getAll("books")) as OfflineBook[];
  return all.map(({ id, title, size }) => ({ id, title, size }));
}
