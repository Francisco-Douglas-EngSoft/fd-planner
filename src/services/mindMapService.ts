import { supabase } from "@/integrations/supabase/client";

export type MindMapRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type MindMapNodeRow = {
  id: string;
  mind_map_id: string;
  parent_id: string | null;
  label: string;
  content: string | null;
  position_x: number | null;
  position_y: number | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export const mindMapService = {
  async list(userId: string): Promise<MindMapRow[]> {
    const { data, error } = await supabase
      .from("mind_maps")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as MindMapRow[];
  },
  async create(payload: { user_id: string; title: string; description?: string | null }): Promise<MindMapRow> {
    const { data, error } = await supabase.from("mind_maps").insert(payload).select("*").single();
    if (error) throw error;
    return data as MindMapRow;
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
    return (data ?? []) as MindMapNodeRow[];
  },
  async upsertNode(node: Partial<MindMapNodeRow> & { mind_map_id: string; label: string }): Promise<MindMapNodeRow> {
    const { data, error } = await supabase.from("mind_map_nodes").upsert(node).select("*").single();
    if (error) throw error;
    return data as MindMapNodeRow;
  },
  async removeNode(id: string): Promise<void> {
    const { error } = await supabase.from("mind_map_nodes").delete().eq("id", id);
    if (error) throw error;
  },
};
