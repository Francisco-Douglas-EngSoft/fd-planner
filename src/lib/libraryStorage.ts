/**
 * Regras do espaço de armazenamento (Supabase Storage).
 * Capacidade do servidor: 2 GB (a tela mostra a % real usada). Aviso a partir de 1,8 GB; envio bloqueado acima de 2 GB.
 * Conta TUDO o que o usuário tem no Storage (livros, capas, capas de cursos, imagens de notas).
 */

export const MB = 1024 * 1024;
export const GB = 1024 * MB;
export const STORAGE_BUDGET_BYTES = Math.round(1.8 * GB);
export const STORAGE_LIMIT_BYTES = 2 * GB;
export const NEAR_BUDGET_RATIO = 0.8;

export interface StorageObject {
  bucket_id: string;
  name: string;
  size: number;
  created_at?: string | null;
}

export interface BookFiles {
  id: string;
  file_path: string;
  cover_path?: string | null;
  file_size?: number | null;
}

export interface BookSize {
  file: number;
  cover: number;
  total: number;
}

export interface StorageSummary {
  total: number;
  byBucket: Record<string, number>;
  perBook: Map<string, BookSize>;
  /** Arquivos do bucket de livros que não pertencem a nenhum livro. */
  orphans: StorageObject[];
}

export type StorageLevel = "ok" | "near" | "over-budget" | "over-limit";

export function summarizeStorage(objects: StorageObject[], books: BookFiles[]): StorageSummary {
  const byBucket: Record<string, number> = {};
  const sizeByPath = new Map<string, number>();
  let total = 0;
  for (const o of objects) {
    const size = Number(o.size) || 0;
    total += size;
    byBucket[o.bucket_id] = (byBucket[o.bucket_id] ?? 0) + size;
    if (o.bucket_id === "books") sizeByPath.set(o.name, size);
  }

  const used = new Set<string>();
  const perBook = new Map<string, BookSize>();
  for (const b of books) {
    const file = sizeByPath.get(b.file_path) ?? (Number(b.file_size) || 0);
    const cover = b.cover_path ? (sizeByPath.get(b.cover_path) ?? 0) : 0;
    used.add(b.file_path);
    if (b.cover_path) used.add(b.cover_path);
    perBook.set(b.id, { file, cover, total: file + cover });
  }

  const orphans = objects.filter(
    (o) => o.bucket_id === "books" && !used.has(o.name) && !o.name.endsWith("/.emptyFolderPlaceholder"),
  );
  return { total, byBucket, perBook, orphans };
}

export function storageLevel(usedBytes: number): StorageLevel {
  if (usedBytes > STORAGE_LIMIT_BYTES) return "over-limit";
  if (usedBytes > STORAGE_BUDGET_BYTES) return "over-budget";
  if (usedBytes >= STORAGE_BUDGET_BYTES * NEAR_BUDGET_RATIO) return "near";
  return "ok";
}

export interface UploadFit {
  after: number;
  level: StorageLevel;
  /** Passa da meta: avisa, mas deixa enviar. */
  warn: boolean;
  /** Passa do limite de envio: bloqueia. */
  blocked: boolean;
}

export function checkUploadFit(usedBytes: number, incomingBytes: number): UploadFit {
  const after = usedBytes + incomingBytes;
  const level = storageLevel(after);
  return { after, level, warn: after > STORAGE_BUDGET_BYTES, blocked: after > STORAGE_LIMIT_BYTES };
}

/** Porcentagem real do espaço do servidor (2 GB) ocupada pelos arquivos do usuário, de 0 a 100. */
export function storageUsagePercent(usedBytes: number, capacityBytes: number = STORAGE_LIMIT_BYTES): number {
  const used = Math.max(0, Number(usedBytes) || 0);
  if (capacityBytes <= 0) return 0;
  return Math.min(100, (used / capacityBytes) * 100);
}

/** "0%", "<0,1%", "12,4%", "100%". */
export function formatPercent(pct: number): string {
  if (pct <= 0) return "0%";
  if (pct < 0.1) return "<0,1%";
  return `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function formatBytes(bytes: number): string {
  const n = Math.max(0, Number(bytes) || 0);
  if (n >= 1024 * MB) return `${(n / (1024 * MB)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} GB`;
  if (n >= MB) return `${(n / MB).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

export const BUCKET_LABELS: Record<string, string> = {
  books: "Livros e capas",
  "course-covers": "Capas de cursos",
  "note-images": "Imagens de notas",
};
