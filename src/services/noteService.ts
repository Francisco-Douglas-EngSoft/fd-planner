/**
 * Note Service
 * Centraliza toda a lógica de negócio relacionada a notas
 */

import { supabase } from '@/integrations/supabase/client';

export interface Note {
  id: string;
  title: string;
  content?: string | null;
  course_id?: string | null;
  mood?: string | null;
  tags?: string[] | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  courses?: {
    id: string;
    name: string;
  };
}

export class NoteService {
  private static readonly cache = new Map<string, { data: Note[]; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Busca todas as notas do usuário (com cache)
   */
  static async getNotes(userId: string): Promise<Note[]> {
    // Verifica cache
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Busca do banco
    const { data, error } = await supabase
      .from('study_notes')
      .select(`
        *,
        courses (id, name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false});

    if (error) throw new Error(error.message);

    // Atualiza cache
    this.cache.set(userId, { data: data || [], timestamp: Date.now() });

    return data || [];
  }

  /**
   * Busca nota por ID
   */
  static async getNoteById(noteId: string): Promise<Note | null> {
    const { data, error } = await supabase
      .from('study_notes')
      .select(`
        *,
        courses (id, name)
      `)
      .eq('id', noteId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Cria nova nota
   */
  static async createNote(userId: string, noteData: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'courses'>): Promise<Note> {
    const { data, error } = await supabase
      .from('study_notes')
      .insert({
        user_id: userId,
        title: noteData.title,
        content: noteData.content || null,
        course_id: noteData.course_id || null,
        mood: noteData.mood || null,
        tags: noteData.tags || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Invalida cache
    this.invalidateCache(userId);

    return data;
  }

  /**
   * Atualiza nota
   */
  static async updateNote(noteId: string, userId: string, updates: Partial<Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'courses'>>): Promise<Note> {
    const updateData: Record<string, any> = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.course_id !== undefined) updateData.course_id = updates.course_id;
    if (updates.mood !== undefined) updateData.mood = updates.mood;
    if (updates.tags !== undefined) updateData.tags = updates.tags;

    const { data, error } = await supabase
      .from('study_notes')
      .update(updateData as never)
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Invalida cache
    this.invalidateCache(userId);

    return data;
  }

  /**
   * Deleta nota
   */
  static async deleteNote(noteId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('study_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    // Invalida cache
    this.invalidateCache(userId);
  }

  /**
   * Busca notas por tag
   */
  static async getNotesByTag(userId: string, tag: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('study_notes')
      .select(`
        *,
        courses (id, name)
      `)
      .eq('user_id', userId)
      .contains('tags', [tag])
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return data || [];
  }

  /**
   * Busca notas por curso
   */
  static async getNotesByCourse(userId: string, courseId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('study_notes')
      .select(`
        *,
        courses (id, name)
      `)
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return data || [];
  }

  /**
   * Busca todas as tags únicas do usuário
   */
  static async getAllTags(userId: string): Promise<string[]> {
    const notes = await this.getNotes(userId);
    const tagsSet = new Set<string>();
    
    notes.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    
    return Array.from(tagsSet).sort();
  }

  /**
   * Invalida cache do usuário
   */
  static invalidateCache(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Limpa todo o cache
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
