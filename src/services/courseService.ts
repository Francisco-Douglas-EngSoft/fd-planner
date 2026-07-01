/**
 * Course Service
 * Centraliza toda a lógica de negócio relacionada a cursos
 */

import { supabase } from '@/integrations/supabase/client';

export interface Course {
  id: string;
  name: string;
  description?: string | null;
  total_hours: number;
  completed_hours: number;
  category?: string | null;
  status?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export class CourseService {
  private static cache = new Map<string, { data: Course[]; timestamp: number }>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Busca todos os cursos do usuário (com cache)
   * SEGURANÇA: userId obtido da sessão autenticada, não do cliente
   */
  static async getCourses(): Promise<Course[]> {
    // Valida sessão
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid session');
    }

    // Verifica cache
    const cached = this.cache.get(user.id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Busca do banco - RLS garante que só verá seus próprios dados
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('name');

    if (error) {
      console.error('[SECURITY] Database error:', error);
      throw new Error('Unable to fetch courses');
    }

    // Atualiza cache
    this.cache.set(user.id, { data: data || [], timestamp: Date.now() });

    return data || [];
  }

  /**
   * Busca curso por ID
   * SEGURANÇA: Valida ownership via RLS
   */
  static async getCourseById(courseId: string): Promise<Course | null> {
    // Valida sessão
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid session');
    }

    // RLS garante que só verá se for dono
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('[SECURITY] Database error:', error);
      throw new Error('Unable to fetch course');
    }

    return data;
  }

  /**
   * Cria novo curso
   * SEGURANÇA: user_id obtido da sessão
   */
  static async createCourse(courseData: Partial<Course>): Promise<Course> {
    // Valida sessão
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid session');
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({
        user_id: user.id,
        name: courseData.name,
        description: courseData.description || null,
        total_hours: courseData.total_hours || 0,
        completed_hours: courseData.completed_hours || 0,
        category: courseData.category || null,
        status: courseData.status || 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('[SECURITY] Database error:', error);
      throw new Error('Unable to create course');
    }

    // Invalida cache
    this.invalidateCache(user.id);

    return data;
  }

  /**
   * Atualiza curso
   * SEGURANÇA: RLS garante que só atualizará se for dono
   */
  static async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
    // Valida sessão
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid session');
    }

    const updateData: Record<string, string | number | null> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.total_hours !== undefined) updateData.total_hours = updates.total_hours;
    if (updates.completed_hours !== undefined) updateData.completed_hours = updates.completed_hours;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await supabase
      .from('courses')
      .update(updateData as never)
      .eq('id', courseId)
      .select()
      .single();

    if (error) {
      console.error('[SECURITY] Database error:', error);
      throw new Error('Unable to update course');
    }

    // Invalida cache
    this.invalidateCache(user.id);

    return data;
  }

  /**
   * Deleta curso
   * SEGURANÇA: RLS garante que só deletará se for dono
   */
  static async deleteCourse(courseId: string): Promise<void> {
    // Valida sessão
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid session');
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      console.error('[SECURITY] Database error:', error);
      throw new Error('Unable to delete course');
    }

    // Invalida cache
    this.invalidateCache(user.id);
  }

  /**
   * Busca cursos por categoria
   * SEGURANÇA: RLS garante acesso apenas aos próprios cursos
   */
  static async getCoursesByCategory(category: string): Promise<Course[]> {
    // Valida sessão
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid session');
    }

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('category', category)
      .order('name');

    if (error) {
      console.error('[SECURITY] Database error:', error);
      throw new Error('Unable to fetch courses');
    }

    return data || [];
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
