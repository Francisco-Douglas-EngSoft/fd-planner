import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MindMapRow = Database["public"]["Tables"]["mind_maps"]["Row"];
export type MindMapInsert = Database["public"]["Tables"]["mind_maps"]["Insert"];
export type MindMapNodeRow = Database["public"]["Tables"]["mind_map_nodes"]["Row"];
export type MindMapNodeInsert = Database["public"]["Tables"]["mind_map_nodes"]["Insert"];

export const mindMapService = {
  async list(userId: string): Promise<MindMapRow[]> {
    const { data, error } = await supabase
      .from("mind_maps")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async create(payload: MindMapInsert): Promise<MindMapRow> {
    const { data, error } = await supabase.from("mind_maps").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("mind_maps").delete().eq("id", id);
    if (error) throw error;
  },
  async listNodes(mindMapId: string): Promise<MindMapNodeRow[]> {
    const { data, error } = await supabase
      .from("mind_map_nodes")
      .select("*")
      .eq("mind_map_id", mindMapId);
    if (error) throw error;
    return data ?? [];
  },
  async upsertNode(node: MindMapNodeInsert): Promise<MindMapNodeRow> {
    const { data, error } = await supabase.from("mind_map_nodes").upsert(node).select("*").single();
    if (error) throw error;
    return data;
  },
  async removeNode(id: string): Promise<void> {
    const { error } = await supabase.from("mind_map_nodes").delete().eq("id", id);
    if (error) throw error;
  },
};
