/**
 * Planning Service
 * Centraliza toda a lógica de negócio relacionada a planejamentos
 */

import { supabase } from '@/integrations/supabase/client';

export interface StudyPlan {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  daily_hours: number;
  study_days: string[];
  total_hours: number;
  planning_type: string;
  planning_category: string;
  semester?: string | null;
  academic_period_start?: string | null;
  academic_period_end?: string | null;
  hours_per_discipline?: number | null;
  color?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  study_plan_courses?: StudyPlanCourse[];
}

export interface StudyPlanCourse {
  id: string;
  study_plan_id: string;
  course_id: string;
  allocated_hours: number;
  is_fixed: boolean;
  study_days: string[];
  sequence_order: number;
  is_completed: boolean;
  courses?: {
    id: string;
    name: string;
    total_hours: number;
    completed_hours: number;
    category?: string | null;
  };
}

export class PlanningService {
  private static readonly cache = new Map<string, { data: StudyPlan[]; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Busca todos os planejamentos do usuário (com cache)
   */
  static async getPlans(userId: string): Promise<StudyPlan[]> {
    // Verifica cache
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Busca do banco
    const { data, error } = await supabase
      .from('study_plans')
      .select(`
        *,
        study_plan_courses (
          *,
          courses (id, name, total_hours, completed_hours, category)
        )
      `)
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) throw new Error(error.message);

    // Atualiza cache
    this.cache.set(userId, { data: data || [], timestamp: Date.now() });

    return data || [];
  }

  /**
   * Busca planejamento por ID
   */
  static async getPlanById(planId: string): Promise<StudyPlan | null> {
    const { data, error } = await supabase
      .from('study_plans')
      .select(`
        *,
        study_plan_courses (
          *,
          courses (id, name, total_hours, completed_hours, category)
        )
      `)
      .eq('id', planId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Busca planejamentos ativos hoje
   */
  static async getActivePlansToday(userId: string, todayDayId: string): Promise<StudyPlan[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('study_plans')
      .select(`
        *,
        study_plan_courses (
          *,
          courses (id, name, total_hours, completed_hours, category)
        )
      `)
      .eq('user_id', userId)
      .lte('start_date', today)
      .gte('end_date', today)
      .contains('study_days', [todayDayId]);

    if (error) throw new Error(error.message);

    return data || [];
  }

  /**
   * Cria novo planejamento
   */
  static async createPlan(userId: string, planData: Omit<StudyPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<StudyPlan> {
    // Validação de datas
    const startDate = new Date(planData.start_date);
    const endDate = new Date(planData.end_date);
    
    if (startDate >= endDate) {
      throw new Error('Data de início deve ser anterior à data de fim');
    }
    
    if (startDate < new Date('1900-01-01') || startDate > new Date('2100-12-31')) {
      throw new Error('Data de início deve estar entre 1900 e 2100');
    }
    
    if (endDate < new Date('1900-01-01') || endDate > new Date('2100-12-31')) {
      throw new Error('Data de fim deve estar entre 1900 e 2100');
    }
    
    const { data, error } = await supabase
      .from('study_plans')
      .insert({
        user_id: userId,
        name: planData.name,
        description: planData.description,
        start_date: planData.start_date,
        end_date: planData.end_date,
        daily_hours: planData.daily_hours,
        study_days: planData.study_days,
        total_hours: planData.total_hours,
        planning_type: planData.planning_type,
        planning_category: planData.planning_category,
        semester: planData.semester || null,
        academic_period_start: planData.academic_period_start || null,
        academic_period_end: planData.academic_period_end || null,
        hours_per_discipline: planData.hours_per_discipline || null,
        color: planData.color || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Invalida cache
    this.invalidateCache(userId);

    return data;
  }

  /**
   * Atualiza planejamento
   */
  static async updatePlan(planId: string, userId: string, updates: Partial<Omit<StudyPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<StudyPlan> {
    const updateData: Record<string, any> = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
    if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
    if (updates.daily_hours !== undefined) updateData.daily_hours = updates.daily_hours;
    if (updates.study_days !== undefined) updateData.study_days = updates.study_days;
    if (updates.total_hours !== undefined) updateData.total_hours = updates.total_hours;
    if (updates.planning_type !== undefined) updateData.planning_type = updates.planning_type;
    if (updates.planning_category !== undefined) updateData.planning_category = updates.planning_category;
    if (updates.semester !== undefined) updateData.semester = updates.semester;
    if (updates.academic_period_start !== undefined) updateData.academic_period_start = updates.academic_period_start;
    if (updates.academic_period_end !== undefined) updateData.academic_period_end = updates.academic_period_end;
    if (updates.hours_per_discipline !== undefined) updateData.hours_per_discipline = updates.hours_per_discipline;
    if (updates.color !== undefined) updateData.color = updates.color;

    const { data, error } = await supabase
      .from('study_plans')
      .update(updateData as never)
      .eq('id', planId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Invalida cache
    this.invalidateCache(userId);

    return data;
  }

  /**
   * Deleta planejamento
   */
  static async deletePlan(planId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('study_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    // Invalida cache
    this.invalidateCache(userId);
  }

  /**
   * Busca cursos de um planejamento
   */
  static async getPlanCourses(planId: string): Promise<StudyPlanCourse[]> {
    const { data, error } = await supabase
      .from('study_plan_courses')
      .select(`
        *,
        courses (id, name, total_hours, completed_hours, category)
      `)
      .eq('study_plan_id', planId)
      .order('sequence_order');

    if (error) throw new Error(error.message);

    return data || [];
  }

  /**
   * Adiciona curso ao planejamento
   */
  static async addCourseToPlan(
    planId: string,
    courseId: string,
    courseData: Partial<StudyPlanCourse>
  ): Promise<StudyPlanCourse> {
    const { data, error } = await supabase
      .from('study_plan_courses')
      .insert({
        study_plan_id: planId,
        course_id: courseId,
        ...courseData,
      } as never)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return data;
  }

  /**
   * Remove curso do planejamento
   */
  static async removeCourseFromPlan(planCourseId: string): Promise<void> {
    const { error } = await supabase
      .from('study_plan_courses')
      .delete()
      .eq('id', planCourseId);

    if (error) throw new Error(error.message);
  }

  /**
   * Marca curso como concluído
   */
  static async markCourseAsCompleted(planCourseId: string): Promise<void> {
    const { error } = await supabase
      .from('study_plan_courses')
      .update({ is_completed: true })
      .eq('id', planCourseId);

    if (error) throw new Error(error.message);
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
