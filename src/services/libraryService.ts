import { supabase } from "@/integrations/supabase/client";

export type BookRow = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  file_path: string | null;
  file_type: string | null;
  cover_url: string | null;
  total_pages: number | null;
  current_page: number | null;
  progress: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export const libraryService = {
  async list(userId: string): Promise<BookRow[]> {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as BookRow[];
  },

  async get(id: string): Promise<BookRow | null> {
    const { data, error } = await supabase.from("books").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data as BookRow) ?? null;
  },

  async create(payload: Partial<BookRow> & { user_id: string; title: string }): Promise<BookRow> {
    const { data, error } = await supabase.from("books").insert(payload).select("*").single();
    if (error) throw error;
    return data as BookRow;
  },

  async update(id: string, patch: Partial<BookRow>): Promise<void> {
    const { error } = await supabase.from("books").update(patch).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) throw error;
  },

  async uploadFile(userId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("books").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    return path;
  },

  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage.from("books").createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },
};
