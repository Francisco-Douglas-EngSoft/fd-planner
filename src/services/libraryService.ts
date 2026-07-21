import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BookRow = Database["public"]["Tables"]["books"]["Row"];
export type BookInsert = Database["public"]["Tables"]["books"]["Insert"];
export type BookUpdate = Database["public"]["Tables"]["books"]["Update"];

export const libraryService = {
  async list(userId: string): Promise<BookRow[]> {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
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

  async remove(id: string): Promise<void> {
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
};
