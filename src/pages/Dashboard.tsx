import { useState, useEffect } from 'react';
import { BookOpen, Clock, Target, Flame, Trophy, TrendingUp, Library, Timer, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { AdvancedAnalytics } from '@/components/analytics/AdvancedAnalytics';
import { WeeklyDeltaCard } from '@/components/dashboard/WeeklyDeltaCard';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { ExpansionPlan } from '@/components/dashboard/ExpansionPlan';


import { CompletedCoursesStats } from '@/components/dashboard/CompletedCoursesStats';
import { CategoryProgressReport } from '@/components/dashboard/CategoryProgressReport';
import { TaskReminders } from '@/components/tasks/TaskReminders';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/hooks/useGuestMode';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDurationHuman } from '@/lib/timeUtils';
import { computeCompletedHours, sumFocusMinutes, applyCompletedHours } from '@/lib/studyHours';
import { StudyAudit } from '@/components/dashboard/StudyAudit';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  }, [user?.id, isReadOnly]);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [profileResult, coursesResult, tasksResult, achievementsResult, focusResult, modulesResult, subModulesResult] = await Promise.all([
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
        supabase
          .from('course_modules')
          .select('id, course_id, hours, is_completed, courses!inner(user_id)')
          .eq('courses.user_id', user.id),
        supabase
          .from('course_submodules')
          .select('module_id, hours, is_completed, course_modules!inner(courses!inner(user_id))')
          .eq('course_modules.courses.user_id', user.id),
      ]);

      const courses = coursesResult.data || [];
      const tasks = tasksResult.data || [];
      const focusSessions = focusResult.data || [];
      const modules = modulesResult.data || [];
      const subModules = subModulesResult.data || [];
      
      const activeCourses = courses.filter(c => c.status !== 'completed');
      const completedCourses = courses.filter(c => c.status === 'completed');

      // Fonte única de verdade: src/lib/studyHours.ts
      const studyHours = computeCompletedHours(modules as never, subModules as never);
      const courseCompletedHours = studyHours.totalCompletedHours;
      const syncedCourses = applyCompletedHours(courses, studyHours);
      
      const totalCourseHours = syncedCourses.reduce((sum, c) => sum + (c.total_hours || 0), 0);
      const totalFocusMinutes = sumFocusMinutes(focusSessions);

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
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      setError(error.message || 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  // Fonte única de formatação de tempo em todo o Dashboard.
  // Recebe SEMPRE minutos e exibe de forma humana e consistente (ex.: "3h 11min").
  const formatTime = (minutes: number) => formatDurationHuman(minutes);

  const statCards = [
    {
      title: 'Horas Estudadas',
      value: formatTime(stats.courseCompletedHours * 60),
      subtitle: 'Progresso concluído nos cursos',
      icon: Clock,
      tint: 'blue',
    },
    {
      title: 'Tempo de Foco',
      value: formatTime(stats.totalFocusMinutes),
      subtitle: 'Cronômetro Pomodoro (sessões)',
      icon: Timer,
      tint: 'violet',
    },
    {
      title: 'Carga Horária Total',
      value: formatTime(stats.totalCourseHours * 60),
      subtitle: 'Meta dos cursos ativos',
      icon: Library,
      tint: 'cyan',
    },
    {
      title: 'Cursos Ativos',
      value: stats.activeCourses,
      subtitle: `${stats.inProgressCourses} em andamento`,
      icon: BookOpen,
      tint: 'teal',
    },
    {
      title: 'Cursos Concluídos',
      value: stats.completedCourses,
      subtitle: 'Finalizados',
      icon: CheckCircle,
      link: '/cursos',
      tint: 'emerald',
    },
    {
      title: 'Tarefas Concluídas',
      value: stats.completedTasks,
      subtitle: `De ${stats.totalTasks} no total`,
      icon: Target,
      tint: 'indigo',
    },
    {
      title: 'Sequência',
      value: `${stats.streakDays} dias`,
      subtitle: `Nível ${stats.level}`,
      icon: Flame,
      link: '/conquistas',
      tint: 'orange',
    },
    {
      title: 'Conquistas',
      value: stats.achievements,
      subtitle: 'Desbloqueadas',
      icon: Trophy,
      link: '/conquistas',
      tint: 'amber',
    },
  ];

  const renderCard = (card: typeof statCards[0], index: number) => {
    const Icon = card.icon;

    return (
      <Card
        className="tint-card group relative h-full overflow-hidden border bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5"
        style={{ ['--tint' as string]: `var(--tint-${card.tint})` }}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="tint-icon rounded-xl p-2.5">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              {card.link && (
                <span className="text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  ver mais →
                </span>
              )}
            </div>
            <div className="space-y-1 flex-1">
              <p className={cn(
                "font-bold font-display leading-none text-foreground",
                typeof card.value === 'string' && /[:h]|min/.test(card.value)
                  ? "text-base sm:text-lg font-mono" 
                  : "text-2xl sm:text-3xl"
              )}>
                {card.value}
              </p>
              <p className="text-xs sm:text-sm font-medium text-foreground/90">
                {card.title}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {card.subtitle}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <OnboardingTour />
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-accent/[0.05] p-5 sm:p-6">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {today}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
            Olá, {userName}! 👋
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Aqui está o resumo dos seus estudos. Continue assim!
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))
        ) : error ? (
          <div className="col-span-full">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : (
          statCards.map((card, index) => {
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
          })
        )}
      </div>

      {/* Tabs por área */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="studies">Estudos</TabsTrigger>
          <TabsTrigger value="habits">Hábitos</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
          <TabsTrigger value="expansion">Expansão</TabsTrigger>
        </TabsList>


        {/* Visão geral */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <TaskReminders />
          <WeeklyDeltaCard />
          <StudyHoursEvolutionChart />
          <WeeklyStats />
          <UpcomingTasks />
        </TabsContent>

        {/* Estudos */}
        <TabsContent value="studies" className="space-y-6 mt-0">
          <StudyComparisonChart />
          <AdvancedAnalytics
            title="Análises avançadas"
            description="Padrões de foco, comparativos e metas"
          />
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
            <FocusSessionsChart />
            <CourseStudyChart />
          </div>
          <ImprovedGoalsManager />
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
            <CategoryChart />
            <CourseHoursBreakdown />
          </div>
          <CategoryProgressReport />
          <CompletedCoursesStats />
          <CourseProgress />
        </TabsContent>

        {/* Hábitos */}
        <TabsContent value="habits" className="space-y-6 mt-0">
          <AntiVicioStats />
        </TabsContent>

        {/* Auditoria */}
        <TabsContent value="audit" className="mt-0">
          <StudyAudit />
        </TabsContent>

        {/* Expansão */}
        <TabsContent value="expansion" className="mt-0">
          <ExpansionPlan />
        </TabsContent>
      </Tabs>
    </div>
  );
}

