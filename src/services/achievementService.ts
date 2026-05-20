/**
 * Achievement Service
 * Centraliza toda a lógica de negócio relacionada a conquistas
 */

import { supabase } from '@/integrations/supabase/client';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  experience_reward: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievements?: Achievement;
}

export interface AchievementProgress {
  achievement: Achievement;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export class AchievementService {
  private static readonly achievementsCache = new Map<string, { data: Achievement[]; timestamp: number }>();
  private static readonly userAchievementsCache = new Map<string, { data: UserAchievement[]; timestamp: number }>();
  private static readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutos (conquistas mudam raramente)

  /**
   * Busca todas as conquistas disponíveis (com cache)
   */
  static async getAchievements(): Promise<Achievement[]> {
    const cacheKey = 'all';
    
    // Verifica cache
    const cached = this.achievementsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Busca do banco
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('experience_reward', { ascending: true });

    if (error) throw new Error(error.message);

    // Atualiza cache
    this.achievementsCache.set(cacheKey, { data: data || [], timestamp: Date.now() });

    return data || [];
  }

  /**
   * Busca conquistas do usuário (com cache)
   */
  static async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    // Verifica cache
    const cached = this.userAchievementsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Busca do banco
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievements (*)
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Atualiza cache
    this.userAchievementsCache.set(userId, { data: data || [], timestamp: Date.now() });

    return data || [];
  }

  /**
   * Busca progresso de todas as conquistas do usuário
   */
  static async getProgress(userId: string): Promise<AchievementProgress[]> {
    const [allAchievements, userAchievements] = await Promise.all([
      this.getAchievements(),
      this.getUserAchievements(userId),
    ]);

    const userAchievementsMap = new Map(
      userAchievements.map(ua => [ua.achievement_id, ua])
    );

    return allAchievements.map(achievement => {
      const userAchievement = userAchievementsMap.get(achievement.id);
      
      return {
        achievement,
        progress: userAchievement ? 100 : 0,
        isUnlocked: !!userAchievement,
        unlockedAt: userAchievement?.unlocked_at,
      };
    });
  }

  /**
   * Desbloqueia conquista para o usuário
   */
  static async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    // Verifica se já está desbloqueada
    const existing = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();

    if (existing.data) {
      return existing.data;
    }

    // Desbloqueia
    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Invalida cache
    this.invalidateUserCache(userId);

    return data;
  }

  /**
   * Atualiza progresso de uma conquista (não usado - conquistas são tudo ou nada)
   */
  static async updateProgress(userId: string, achievementId: string): Promise<void> {
    // Conquistas são desbloqueadas completamente ou não
    // Esta função existe apenas para compatibilidade futura
    await this.unlockAchievement(userId, achievementId);
  }

  /**
   * Verifica e desbloqueia conquistas automaticamente baseado em critérios
   */
  static async checkAndUnlockAchievements(userId: string): Promise<UserAchievement[]> {
    const achievements = await this.getAchievements();
    const unlockedAchievements: UserAchievement[] = [];

    for (const achievement of achievements) {
      const shouldUnlock = await this.checkAchievementCriteria(userId, achievement);
      
      if (shouldUnlock) {
        try {
          const unlocked = await this.unlockAchievement(userId, achievement.id);
          unlockedAchievements.push(unlocked);
        } catch (error) {
          // Já desbloqueada, ignora
        }
      }
    }

    return unlockedAchievements;
  }

  /**
   * Verifica se usuário atende critérios de uma conquista
   */
  private static async checkAchievementCriteria(userId: string, achievement: Achievement): Promise<boolean> {
    switch (achievement.requirement_type) {
      case 'focus_sessions':
        return this.checkFocusSessions(userId, achievement.requirement_value);
      
      case 'total_hours':
        return this.checkTotalHours(userId, achievement.requirement_value);
      
      case 'courses_completed':
        return this.checkCoursesCompleted(userId, achievement.requirement_value);
      
      case 'streak_days':
        return this.checkStreakDays(userId, achievement.requirement_value);
      
      default:
        return false;
    }
  }

  /**
   * Verifica número de sessões de foco
   */
  private static async checkFocusSessions(userId: string, required: number): Promise<boolean> {
    const { count, error } = await supabase
      .from('focus_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) return false;
    return (count || 0) >= required;
  }

  /**
   * Verifica total de horas estudadas
   */
  private static async checkTotalHours(userId: string, required: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('duration_minutes')
      .eq('user_id', userId);

    if (error) return false;
    
    const totalHours = (data || []).reduce((sum, s) => sum + (s.duration_minutes / 60), 0);
    return totalHours >= required;
  }

  /**
   * Verifica número de cursos concluídos
   */
  private static async checkCoursesCompleted(userId: string, required: number): Promise<boolean> {
    const { count, error } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) return false;
    return (count || 0) >= required;
  }

  /**
   * Verifica sequência de dias
   */
  private static async checkStreakDays(userId: string, required: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(365);

    if (error) return false;

    const uniqueDays = new Set<string>();
    for (const session of data || []) {
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

    return streak >= required;
  }

  /**
   * Invalida cache do usuário
   */
  static invalidateUserCache(userId: string): void {
    this.userAchievementsCache.delete(userId);
  }

  /**
   * Limpa todo o cache
   */
  static clearCache(): void {
    this.achievementsCache.clear();
    this.userAchievementsCache.clear();
  }
}
