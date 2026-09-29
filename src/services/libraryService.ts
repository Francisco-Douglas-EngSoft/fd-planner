import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchAllPaginated } from "@/lib/supabasePagination";
import { listStoragePaths } from "@/lib/storageSync";

export type BookRow = Database["public"]["Tables"]["books"]["Row"];
export type BookInsert = Database["public"]["Tables"]["books"]["Insert"];
export type BookUpdate = Database["public"]["Tables"]["books"]["Update"];

export const libraryService = {
  async list(userId: string): Promise<BookRow[]> {
    // Busca paginada (500 por bloco) para não esbarrar no limite de 1000 linhas.
    const rows = await fetchAllPaginated<BookRow>(
      () =>
        supabase
          .from("books")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false }) as never,
    );
    return this.syncWithStorage(userId, rows);
  },

  /**
   * Sincroniza banco ↔ Storage: remove do banco livros cujo arquivo foi apagado
   * do Storage e limpa capas inexistentes.
   */
  async syncWithStorage(userId: string, rows: BookRow[]): Promise<BookRow[]> {
    const [files, covers] = await Promise.all([
      listStoragePaths("books", userId),
      listStoragePaths("books", `${userId}/covers`),
    ]);
    if (!files) return rows; // Storage indisponível: não arrisca apagar nada.
    const orphanIds: string[] = [];
    const brokenCoverIds: string[] = [];
    const kept: BookRow[] = [];
    for (const b of rows) {
      if (b.file_path && !files.has(b.file_path)) {
        orphanIds.push(b.id);
        continue;
      }
      if (b.cover_path && covers && !covers.has(b.cover_path)) {
        brokenCoverIds.push(b.id);
        kept.push({ ...b, cover_path: null });
      } else kept.push(b);
    }
    if (orphanIds.length) {
      await this.deleteRelated(orphanIds);
      await supabase.from("books").delete().in("id", orphanIds);
    }
    if (brokenCoverIds.length) {
      await supabase.from("books").update({ cover_path: null }).in("id", brokenCoverIds);
    }
    return kept;
  },

  async deleteRelated(ids: string[]): Promise<void> {
    await Promise.all([
      supabase.from("annotations").delete().in("book_id", ids),
      supabase.from("bookmarks").delete().in("book_id", ids),
      supabase.from("reading_sessions").delete().in("book_id", ids),
      supabase.from("book_collections").delete().in("book_id", ids),
    ]);
  },

  async get(id: string): Promise<BookRow | null> {
    const { data, error } = await supabase.from("books").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  async create(payload: BookInsert): Promise<BookRow> {
    const { data, error } = await supabase.from("books").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  },

  async update(id: string, patch: BookUpdate): Promise<void> {
    const { error } = await supabase.from("books").update(patch).eq("id", id);
    if (error) throw error;
  },

  /** Exclui o livro do banco e seus arquivos (PDF/EPUB e capa) do Storage. */
  async remove(id: string): Promise<void> {
    const { data: book } = await supabase.from("books").select("file_path,cover_path").eq("id", id).maybeSingle();
    const paths = [book?.file_path, book?.cover_path].filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("books").remove(paths);
    await this.deleteRelated([id]);
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) throw error;
  },

  async uploadFile(userId: string, file: File): Promise<string> {
    const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
    const ext = ["pdf", "epub"].includes(rawExt) ? rawExt : "bin";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const contentType =
      file.type ||
      (ext === "pdf" ? "application/pdf" : ext === "epub" ? "application/epub+zip" : "application/octet-stream");

    // Arquivos grandes (>6MB) usam upload resumable (TUS) para evitar timeout/limite do POST.
    const useResumable = file.size > 6 * 1024 * 1024;
    const { error } = await supabase.storage.from("books").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType,
      ...(useResumable ? { duplex: "half" } : {}),
    } as any);
    if (error) {
      // Propaga a mensagem real do Supabase para a UI (limite de tamanho, MIME, permissão, etc.).
      throw new Error(error.message || "Falha ao enviar arquivo para o Storage");
    }
    return path;
  },

  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage.from("books").createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },

  /**
   * Envia a capa (JPEG) para o bucket privado `books`, sob `{userId}/covers/{uuid}.jpg`,
   * e retorna o path armazenado (para `books.cover_path`).
   */
  async uploadCover(userId: string, blob: Blob): Promise<string> {
    const path = `${userId}/covers/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from("books").upload(path, blob, {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/jpeg",
    });
    if (error) throw new Error(error.message || "Falha ao enviar capa");
    return path;
  },

  async removeStorageObject(path: string): Promise<void> {
    if (!path) return;
    await supabase.storage.from("books").remove([path]);
  },
};
