/**
 * Task Service
 * Centraliza toda a lógica de negócio relacionada a tarefas
 */

import { supabase } from '@/integrations/supabase/client';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  course_id?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  courses?: {
    id: string;
    name: string;
  };
}

export class TaskService {
  private static readonly cache = new Map<string, { data: Task[]; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Busca todas as tarefas do usuário (com cache)
   */
  static async getTasks(userId: string): Promise<Task[]> {
    // Verifica cache
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Busca do banco
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        courses (id, name)
      `)
      .eq('user_id', userId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw new Error(error.message);

    const tasks = (data || []) as unknown as Task[];
    // Atualiza cache
    this.cache.set(userId, { data: tasks, timestamp: Date.now() });

    return tasks;
  }

  /**
   * Busca tarefa por ID
   */
  static async getTaskById(taskId: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        courses (id, name)
      `)
      .eq('id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(error.message);
    }

    return data as unknown as Task;
  }

  /**
   * Cria nova tarefa
   */
  static async createTask(userId: string, taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'courses'>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: taskData.title,
        description: taskData.description || null,
        due_date: taskData.due_date || null,
        priority: taskData.priority || 'normal',
        status: taskData.status || 'pending',
        course_id: taskData.course_id || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Invalida cache
    this.invalidateCache(userId);

    return data as unknown as Task;
  }

  /**
   * Atualiza tarefa
   */
  static async updateTask(taskId: string, userId: string, updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'courses'>>): Promise<Task> {
    const updateData: Record<string, string | number | null> = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.course_id !== undefined) updateData.course_id = updates.course_id;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData as never)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Invalida cache
    this.invalidateCache(userId);

    return data as unknown as Task;
  }

  /**
   * Deleta tarefa
   */
  static async deleteTask(taskId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    // Invalida cache
    this.invalidateCache(userId);
  }

  /**
   * Busca tarefas por status
   */
  static async getTasksByStatus(userId: string, status: Task['status']): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        courses (id, name)
      `)
      .eq('user_id', userId)
      .eq('status', status)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw new Error(error.message);

    return (data || []) as unknown as Task[];
  }

  /**
   * Busca tarefas por prioridade
   */
  static async getTasksByPriority(userId: string, priority: Task['priority']): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        courses (id, name)
      `)
      .eq('user_id', userId)
      .eq('priority', priority)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw new Error(error.message);

    return (data || []) as unknown as Task[];
  }

  /**
   * Marca tarefa como concluída
   */
  static async markAsCompleted(taskId: string, userId: string): Promise<Task> {
    return this.updateTask(taskId, userId, { status: 'completed' });
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
