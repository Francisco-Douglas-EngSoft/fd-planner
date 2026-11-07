/**
 * Serviço de coleções de livros.
 */
import { supabase } from "@/integrations/supabase/client";

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  created_at: string;
}

export interface CollectionWithCount extends Collection {
  book_count: number;
}

export const collectionsService = {
  async list(userId: string): Promise<CollectionWithCount[]> {
    const { data: cols, error } = await supabase
      .from("collections")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    if (error) throw error;

    const { data: links } = await supabase
      .from("book_collections")
      .select("collection_id")
      .in("collection_id", (cols ?? []).map((c) => c.id));

    const countMap = new Map<string, number>();
    for (const l of links ?? []) {
      countMap.set(l.collection_id, (countMap.get(l.collection_id) ?? 0) + 1);
    }

    return (cols ?? []).map((c) => ({
      ...c,
      book_count: countMap.get(c.id) ?? 0,
    }));
  },

  async create(userId: string, name: string, color = "#6366f1", icon = "BookOpen"): Promise<Collection> {
    const { data, error } = await supabase
      .from("collections")
      .insert({ user_id: userId, name, color, icon } as never)
      .select("*")
      .single();
    if (error) throw error;
    return data as Collection;
  },

  async update(id: string, patch: Partial<Pick<Collection, "name" | "color" | "icon">>): Promise<void> {
    const { error } = await supabase.from("collections").update(patch as never).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) throw error;
  },

  async addBook(bookId: string, collectionId: string): Promise<void> {
    const { error } = await supabase
      .from("book_collections")
      .insert({ book_id: bookId, collection_id: collectionId } as never)
      .select();
    // Ignorar duplicatas (unique constraint)
    if (error && !error.message.includes("unique")) throw error;
  },

  async removeBook(bookId: string, collectionId: string): Promise<void> {
    const { error } = await supabase
      .from("book_collections")
      .delete()
      .eq("book_id", bookId)
      .eq("collection_id", collectionId);
    if (error) throw error;
  },

  async getBookCollections(bookId: string): Promise<string[]> {
    const { data } = await supabase
      .from("book_collections")
      .select("collection_id")
      .eq("book_id", bookId);
    return (data ?? []).map((r) => r.collection_id);
  },

  async getCollectionBooks(collectionId: string): Promise<string[]> {
    const { data } = await supabase
      .from("book_collections")
      .select("book_id")
      .eq("collection_id", collectionId);
    return (data ?? []).map((r) => r.book_id);
  },
};
