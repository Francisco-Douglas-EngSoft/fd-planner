import { useState, useEffect } from 'react';
import { BookOpen, Clock, Target, Flame, Trophy, TrendingUp, Library, Timer, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { CourseProgress } from '@/components/dashboard/CourseProgress';
import { UpcomingTasks } from '@/components/dashboard/UpcomingTasks';
import { CategoryChart } from '@/components/dashboard/CategoryChart';
import { CourseHoursBreakdown } from '@/components/dashboard/CourseHoursBreakdown';
import { WeeklyStats } from '@/components/dashboard/WeeklyStats';
import { UnifiedGoalsManager } from '@/components/dashboard/UnifiedGoalsManager';
import { ImprovedGoalsManager } from '@/components/dashboard/ImprovedGoalsManager';
import { AntiVicioStats } from '@/components/dashboard/AntiVicioStats';
import { FocusSessionsChart } from '@/components/dashboard/FocusSessionsChart';
import { CourseStudyChart } from '@/components/dashboard/CourseStudyChart';
import { StudyComparisonChart } from '@/components/dashboard/StudyComparisonChart';
import { StudyHoursEvolutionChart } from '@/components/dashboard/StudyHoursEvolutionChart';

import { CompletedCoursesStats } from '@/components/dashboard/CompletedCoursesStats';
import { CategoryProgressReport } from '@/components/dashboard/CategoryProgressReport';
import { TaskReminders } from '@/components/tasks/TaskReminders';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/hooks/useGuestMode';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatHoursToHMS } from '@/lib/timeUtils';

export default function Dashboard() {
  const [stats, setStats] = useState({
    courseCompletedHours: 0,
    totalFocusMinutes: 0,
    activeCourses: 0,
    inProgressCourses: 0,
    completedCourses: 0,
    completedTasks: 0,
    totalTasks: 0,
    streakDays: 0,
    level: 1,
    achievements: 0,
    totalCourseHours: 0,
  });
  const [userName, setUserName] = useState('');
  const { user } = useAuth();
  const { isReadOnly, getDemoData } = useGuestMode();

  useEffect(() => {
    if (isReadOnly) {
      const demoData = getDemoData();
      setUserName('Visitante');
      setStats(demoData.stats);
    } else if (user) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isReadOnly]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const [profileResult, coursesResult, tasksResult, achievementsResult, focusResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, streak_days, level')
          .eq('id', user.id)
          .single(),
        supabase
          .from('courses')
          .select('id, status, total_hours, completed_hours')
          .eq('user_id', user.id),
        supabase
          .from('tasks')
          .select('id, status')
          .eq('user_id', user.id),
        supabase
          .from('user_achievements')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('focus_sessions')
          .select('duration_minutes')
          .eq('user_id', user.id)
          .eq('session_type', 'work'),
      ]);

      const courses = coursesResult.data || [];
      const tasks = tasksResult.data || [];
      const focusSessions = focusResult.data || [];
      
      const activeCourses = courses.filter(c => c.status !== 'completed');
      const completedCourses = courses.filter(c => c.status === 'completed');
      const courseCompletedHours = courses.reduce((sum, c) => sum + (c.completed_hours || 0), 0);
      const totalCourseHours = activeCourses.reduce((sum, c) => sum + (c.total_hours || 0), 0);
      const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

      setUserName(profileResult.data?.full_name || user.email?.split('@')[0] || 'Estudante');
      setStats({
        courseCompletedHours,
        totalFocusMinutes,
        activeCourses: activeCourses.length,
        inProgressCourses: activeCourses.filter(c => c.status === 'in_progress').length,
        completedCourses: completedCourses.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        totalTasks: tasks.length,
        streakDays: profileResult.data?.streak_days || 0,
        level: profileResult.data?.level || 1,
        achievements: achievementsResult.count || 0,
        totalCourseHours,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const formatFocusTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  };

  const statCards = [
    {
      title: 'Horas Estudadas',
      value: formatHoursToHMS(stats.courseCompletedHours),
      subtitle: 'Módulos concluídos',
      icon: Clock,
      gradient: 'bg-gradient-primary',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Tempo de Foco',
      value: formatFocusTime(stats.totalFocusMinutes),
      subtitle: 'Pomodoro total',
      icon: Timer,
      gradient: 'bg-gradient-to-br from-orange-400 to-red-500',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Carga Horária Total',
      value: formatHoursToHMS(stats.totalCourseHours),
      subtitle: 'Cursos ativos',
      icon: Library,
      gradient: 'bg-gradient-success',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Cursos Ativos',
      value: stats.activeCourses,
      subtitle: `${stats.inProgressCourses} em andamento`,
      icon: BookOpen,
      gradient: 'bg-gradient-accent',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Cursos Concluídos',
      value: stats.completedCourses,
      subtitle: 'Finalizados',
      icon: CheckCircle,
      gradient: 'bg-gradient-to-br from-emerald-400 to-green-600',
      iconBg: 'bg-white/20',
      link: '/cursos',
    },
    {
      title: 'Tarefas Concluídas',
      value: stats.completedTasks,
      subtitle: `De ${stats.totalTasks} no total`,
      icon: Target,
      gradient: 'bg-gradient-to-br from-teal-400 to-cyan-500',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Sequência',
      value: `${stats.streakDays} dias`,
      subtitle: `Nível ${stats.level}`,
      icon: Flame,
      gradient: 'bg-gradient-warm',
      iconBg: 'bg-white/20',
      link: '/conquistas',
    },
    {
      title: 'Conquistas',
      value: stats.achievements,
      subtitle: 'Desbloqueadas',
      icon: Trophy,
      gradient: 'bg-gradient-to-br from-amber-400 to-orange-500',
      iconBg: 'bg-white/20',
      link: '/conquistas',
    },
  ];

  const renderCard = (card: typeof statCards[0], index: number) => {
    const Icon = card.icon;
    
    return (
      <Card className={cn(
        "h-full overflow-hidden card-animated card-shine",
        card.gradient,
        "text-white border-0 shadow-md"
      )}>
        <CardContent className="p-4 sm:p-5 relative z-10">
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
              <div className={cn("rounded-xl p-2.5 icon-float", card.iconBg)}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="space-y-1 flex-1">
              <p className={cn(
                "font-bold font-display leading-none",
                typeof card.value === 'string' && (card.value.includes(':') || card.value.includes('min'))
                  ? "text-base sm:text-lg font-mono" 
                  : "text-2xl sm:text-3xl"
              )}>
                {card.value}
              </p>
              <p className="text-xs sm:text-sm font-medium text-white/85">
                {card.title}
              </p>
              <p className="text-[10px] sm:text-xs text-white/60">
                {card.subtitle}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold font-display">
          Olá, {userName}! 👋
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Aqui está o resumo dos seus estudos. Continue assim!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {statCards.map((card, index) => {
          if (card.link) {
            return (
              <Link key={index} to={card.link} className="block">
                {renderCard(card, index)}
              </Link>
            );
          }
          return (
            <div key={index} className="block">
              {renderCard(card, index)}
            </div>
          );
        })}
      </div>

      {/* Task Reminders */}
      <TaskReminders />

      {/* Study Hours Evolution Chart - Full Width */}
      <StudyHoursEvolutionChart />

      {/* Comparison Chart - Focus vs Course Hours */}
      <StudyComparisonChart />

      {/* Focus & Course Study Charts - Side by Side */}
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
        <FocusSessionsChart />
        <CourseStudyChart />
      </div>

      {/* Weekly Stats */}
      <WeeklyStats />

      {/* Improved Goals Manager - Metas de Foco e Cursos lado a lado */}
      <ImprovedGoalsManager />

      {/* Charts Row - Full Width */}
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
        <CategoryChart />
        <CourseHoursBreakdown />
      </div>

      {/* Category Progress Report */}
      <CategoryProgressReport />

      {/* Completed Courses Stats - Full Width */}
      <CompletedCoursesStats />

      {/* AntiVício & Course Progress */}
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
        <AntiVicioStats />
        <CourseProgress />
      </div>

      {/* Bottom Row - Upcoming Tasks */}
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-1">
        <UpcomingTasks />
      </div>
    </div>
  );
}
