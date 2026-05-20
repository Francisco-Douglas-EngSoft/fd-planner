/**
 * Focus Service
 * Centraliza toda a lógica de negócio relacionada a sessões de foco
 */

import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

export interface FocusSession {
  id: string;
  course_id?: string | null;
  duration_minutes: number; // em minutos
  session_type: 'work' | 'break' | 'longBreak';
  mood?: string | null;
  notes?: string | null;
  user_id: string;
  completed_at: string;
  courses?: {
    id: string;
    name: string;
  };
}

export interface DailyStats {
  totalSessions: number;
  totalMinutes: number;
  workSessions: number;
  breakSessions: number;
  averageSessionMinutes: number;
  coursesStudied: number;
}

export interface WeeklyStats {
  totalSessions: number;
  totalMinutes: number;
  totalHours: number;
  dailyAverage: number;
  mostProductiveDay: string;
  streak: number;
}

export class FocusService {
  private static readonly cache = new Map<string, { data: FocusSession[]; timestamp: number }>();
  private static readonly CACHE_TTL = 1 * 60 * 1000; // 1 minuto (dados de foco mudam frequentemente)

  /**
   * Busca todas as sessões do usuário (com cache)
   */
  static async getSessions(userId: string): Promise<FocusSession[]> {
    // Verifica cache
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Busca do banco
    const { data, error } = await supabase
      .from('focus_sessions')
      .select(`
        *,
        courses (id, name)
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) throw new Error(error.message);

    const sessions = (data || []) as unknown as FocusSession[];
    // Atualiza cache
    this.cache.set(userId, { data: sessions, timestamp: Date.now() });

    return sessions;
  }

  /**
   * Cria nova sessão de foco
   */
  static async createSession(userId: string, sessionData: Omit<FocusSession, 'id' | 'user_id' | 'completed_at' | 'courses'>): Promise<FocusSession> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: userId,
        course_id: sessionData.course_id || null,
        duration_minutes: sessionData.duration_minutes,
        session_type: sessionData.session_type,
        mood: sessionData.mood || null,
        notes: sessionData.notes || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Invalida cache
    this.invalidateCache(userId);

    return data as unknown as FocusSession;
  }

  /**
   * Busca estatísticas do dia
   */
  static async getTodayStats(userId: string): Promise<DailyStats> {
    const today = new Date();
    const startDate = startOfDay(today).toISOString();
    const endDate = endOfDay(today).toISOString();

    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', startDate)
      .lte('completed_at', endDate);

    if (error) throw new Error(error.message);

    const sessions = data || [];
    const workSessions = sessions.filter(s => s.session_type === 'work');
    const breakSessions = sessions.filter(s => s.session_type !== 'work');
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    const uniqueCourses = new Set(sessions.filter(s => s.course_id).map(s => s.course_id));

    return {
      totalSessions: sessions.length,
      totalMinutes: Math.round(totalMinutes),
      workSessions: workSessions.length,
      breakSessions: breakSessions.length,
      averageSessionMinutes: sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0,
      coursesStudied: uniqueCourses.size,
    };
  }

  /**
   * Busca estatísticas da semana
   */
  static async getWeeklyStats(userId: string): Promise<WeeklyStats> {
    const today = new Date();
    const startDate = startOfWeek(today, { weekStartsOn: 0 }).toISOString();
    const endDate = endOfWeek(today, { weekStartsOn: 0 }).toISOString();

    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', startDate)
      .lte('completed_at', endDate);

    if (error) throw new Error(error.message);

    const sessions = data || [];
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalHours = totalMinutes / 60;
    const dailyAverage = totalMinutes / 7;

    // Encontra dia mais produtivo
    const sessionsByDay: Record<string, number> = {};
    for (const session of sessions) {
      const day = new Date(session.completed_at).toLocaleDateString('pt-BR', { weekday: 'long' });
      sessionsByDay[day] = (sessionsByDay[day] || 0) + session.duration_minutes;
    }

    const mostProductiveDay = Object.entries(sessionsByDay).reduce(
      (max, [day, minutes]) => (minutes > max.minutes ? { day, minutes } : max),
      { day: 'Nenhum', minutes: 0 }
    ).day;

    // Calcula streak (dias consecutivos com sessões)
    const streak = await this.calculateStreak(userId);

    return {
      totalSessions: sessions.length,
      totalMinutes: Math.round(totalMinutes),
      totalHours: Math.round(totalHours * 10) / 10,
      dailyAverage: Math.round(dailyAverage),
      mostProductiveDay,
      streak,
    };
  }

  /**
   * Calcula sequência de dias consecutivos com sessões
   */
  static async calculateStreak(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(365); // Últimos 365 dias

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) return 0;

    const uniqueDays = new Set<string>();
    for (const session of data) {
      const day = new Date(session.completed_at).toISOString().split('T')[0];
      uniqueDays.add(day);
    }

    const sortedDays = Array.from(uniqueDays).sort((a, b) => b.localeCompare(a));
    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const day of sortedDays) {
      const sessionDate = new Date(day);
      sessionDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Busca sessões por curso
   */
  static async getSessionsByCourse(userId: string, courseId: string): Promise<FocusSession[]> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select(`
        *,
        courses (id, name)
      `)
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .order('completed_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as unknown as FocusSession[];
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
