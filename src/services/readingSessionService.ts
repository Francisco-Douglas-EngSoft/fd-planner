/**
 * Serviço unificado de sessões de leitura.
 * Separa progresso PDF (página) de EPUB (CFI + percentual).
 * Inclui fila offline para sincronização quando a rede retornar.
 */
import { supabase } from "@/integrations/supabase/client";

export type BookType = "pdf" | "epub" | "other";

export interface ReadingSessionPayload {
  user_id: string;
  book_id: string;
  book_type: BookType;
  date: string;
  duration_minutes: number;
  // PDF
  pages_read?: number;
  start_page?: number;
  end_page?: number;
  // EPUB
  start_cfi?: string | null;
  end_cfi?: string | null;
  start_pct?: number;
  end_pct?: number;
}

const OFFLINE_KEY = "fd:offline:reading_sessions";

function loadQueue(): ReadingSessionPayload[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveQueue(q: ReadingSessionPayload[]) {
  try {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(q));
  } catch { /* storage full — silently ignore */ }
}

/** Persiste a sessão. Se offline, enfileira para reenvio posterior. */
export async function saveReadingSession(payload: ReadingSessionPayload): Promise<void> {
  try {
    const { error } = await supabase.from("reading_sessions").insert({
      user_id: payload.user_id,
      book_id: payload.book_id,
      date: payload.date,
      duration_minutes: payload.duration_minutes,
      pages_read: payload.pages_read ?? null,
      book_type: payload.book_type,
      start_cfi: payload.start_cfi ?? null,
      end_cfi: payload.end_cfi ?? null,
      start_pct: payload.start_pct ?? null,
      end_pct: payload.end_pct ?? null,
    } as never);
    if (error) throw error;
    // Se salvou com sucesso, tenta sincronizar a fila pendente
    flushOfflineQueue();
  } catch {
    // Sem rede ou erro: enfileira localmente
    const q = loadQueue();
    q.push(payload);
    saveQueue(q);
  }
}

/** Tenta reenviar sessões offline acumuladas. */
export async function flushOfflineQueue(): Promise<void> {
  const q = loadQueue();
  if (!q.length) return;
  const remaining: ReadingSessionPayload[] = [];
  for (const p of q) {
    try {
      const { error } = await supabase.from("reading_sessions").insert({
        user_id: p.user_id,
        book_id: p.book_id,
        date: p.date,
        duration_minutes: p.duration_minutes,
        pages_read: p.pages_read ?? null,
        book_type: p.book_type,
        start_cfi: p.start_cfi ?? null,
        end_cfi: p.end_cfi ?? null,
        start_pct: p.start_pct ?? null,
        end_pct: p.end_pct ?? null,
      } as never);
      if (error) remaining.push(p);
    } catch {
      remaining.push(p);
    }
  }
  saveQueue(remaining);
}

/** Salva também em focus_sessions (XP do sistema) */
export async function saveFocusSession(
  userId: string,
  minutes: number,
  bookTitle: string,
): Promise<void> {
  await supabase.from("focus_sessions").insert({
    user_id: userId,
    duration_minutes: minutes,
    session_type: "work",
    notes: `Leitura: ${bookTitle}`,
  } as never);
}
