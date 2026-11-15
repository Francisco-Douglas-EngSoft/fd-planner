import { useState, useEffect } from 'react';
import { BookOpen, Clock, Target, Flame, Trophy, TrendingUp, Library, Timer, CheckCircle, Hourglass } from 'lucide-react';
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
import { StudyRhythmChart } from '@/components/dashboard/StudyRhythmChart';
import { WeeklyModuleGoalCard } from '@/components/dashboard/WeeklyModuleGoalCard';
import { useI18n } from '@/i18n';
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
import { computeCompletedHours, sumFocusMinutes, applyCompletedHours, computeRemainingHours } from '@/lib/studyHours';
import { useRealtimeFocusSessions } from '@/hooks/useRealtimeFocusSessions';
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
    remainingHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const { user } = useAuth();
  const { isReadOnly, getDemoData } = useGuestMode();
  const { t, localeTag } = useI18n();
  const refreshKey = useRealtimeFocusSessions(isReadOnly ? undefined : user?.id);

  useEffect(() => {
    if (isReadOnly) {
      const demoData = getDemoData();
      setUserName(t('Visitante', 'Guest'));
      const demo = demoData.stats;
      setStats({
        ...demo,
        remainingHours: Math.max(0, (demo.totalCourseHours || 0) - (demo.courseCompletedHours || 0)),
      });
      setLoading(false);
    } else if (user) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isReadOnly]);

  // Atualiza os cards quando cursos/sessões mudam (sem mostrar o carregamento).
  useEffect(() => {
    if (!user || isReadOnly || refreshKey === 0) return;
    fetchStats(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Ao voltar para a aba, recalcula (ex.: módulos concluídos em outra tela).
  useEffect(() => {
    if (!user || isReadOnly) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchStats(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isReadOnly]);

  const fetchStats = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
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
      const remainingHours = computeRemainingHours(syncedCourses);

      setUserName(profileResult.data?.full_name || user.email?.split('@')[0] || t('Estudante', 'Student'));
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
        remainingHours,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      setError(error.message || t('Erro ao carregar estatísticas', 'Error loading statistics'));
    } finally {
      setLoading(false);
    }
  };

  // Fonte única de formatação de tempo em todo o Dashboard.
  // Recebe SEMPRE minutos e exibe de forma humana e consistente (ex.: "3h 11min").
  const formatTime = (minutes: number) => formatDurationHuman(minutes);

  const pctDone = stats.totalCourseHours > 0
    ? Math.min(100, Math.round(((stats.totalCourseHours - stats.remainingHours) / stats.totalCourseHours) * 100))
    : 0;

  const statCards = [
    {
      title: t('Horas Estudadas', 'Hours Studied'),
      value: formatTime(stats.courseCompletedHours * 60),
      subtitle: t('Progresso concluído nos cursos', 'Completed course progress'),
      icon: Clock,
      tint: 'blue',
    },
    {
      title: t('Tempo de Foco', 'Focus Time'),
      value: formatTime(stats.totalFocusMinutes),
      subtitle: t('Cronômetro Pomodoro (sessões)', 'Pomodoro timer (sessions)'),
      icon: Timer,
      tint: 'violet',
    },
    {
      title: t('Carga Horária Total', 'Total Workload'),
      value: formatTime(stats.totalCourseHours * 60),
      subtitle: t('Meta dos cursos ativos', 'Active courses target'),
      icon: Library,
      tint: 'cyan',
    },
    {
      title: t('Horas Restantes', 'Hours Remaining'),
      value: formatTime(stats.remainingHours * 60),
      subtitle: stats.totalCourseHours > 0
        ? t(`${pctDone}% da carga concluída`, `${pctDone}% of workload done`)
        : t('Falta estudar nos cursos', 'Left to study in your courses'),
      icon: Hourglass,
      link: '/cursos',
      tint: 'rose',
    },
    {
      title: t('Cursos Ativos', 'Active Courses'),
      value: stats.activeCourses,
      subtitle: t(`${stats.inProgressCourses} em andamento`, `${stats.inProgressCourses} in progress`),
      icon: BookOpen,
      tint: 'teal',
    },
    {
      title: t('Cursos Concluídos', 'Completed Courses'),
      value: stats.completedCourses,
      subtitle: t('Finalizados', 'Finished'),
      icon: CheckCircle,
      link: '/cursos',
      tint: 'emerald',
    },
    {
      title: t('Tarefas Concluídas', 'Tasks Completed'),
      value: stats.completedTasks,
      subtitle: t(`De ${stats.totalTasks} no total`, `Of ${stats.totalTasks} total`),
      icon: Target,
      tint: 'indigo',
    },
    {
      title: t('Sequência', 'Streak'),
      value: t(`${stats.streakDays} dias`, `${stats.streakDays} days`),
      subtitle: t(`Nível ${stats.level}`, `Level ${stats.level}`),
      icon: Flame,
      link: '/conquistas',
      tint: 'orange',
    },
    {
      title: t('Conquistas', 'Achievements'),
      value: stats.achievements,
      subtitle: t('Desbloqueadas', 'Unlocked'),
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
                  {t('ver mais →', 'see more →')}
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

  const today = new Date().toLocaleDateString(localeTag, {
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
            {t('Olá', 'Hi')}, {userName}! 👋
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('Aqui está o resumo dos seus estudos. Continue assim!', "Here's a summary of your studies. Keep it up!")}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {loading ? (
          Array.from({ length: 9 }).map((_, i) => (
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
          <TabsTrigger value="overview">{t('Visão geral', 'Overview')}</TabsTrigger>
          <TabsTrigger value="studies">{t('Estudos', 'Studies')}</TabsTrigger>
          <TabsTrigger value="habits">{t('Hábitos', 'Habits')}</TabsTrigger>
          <TabsTrigger value="audit">{t('Auditoria', 'Audit')}</TabsTrigger>
          <TabsTrigger value="expansion">{t('Expansão', 'Expansion')}</TabsTrigger>
        </TabsList>


        {/* Visão geral */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <TaskReminders />
          <WeeklyModuleGoalCard />
          <WeeklyDeltaCard />
          <StudyRhythmChart />
          <StudyHoursEvolutionChart />
          <WeeklyStats />
          <UpcomingTasks />
        </TabsContent>

        {/* Estudos */}
        <TabsContent value="studies" className="space-y-6 mt-0">
          <StudyComparisonChart />
          <AdvancedAnalytics
            title={t('Análises avançadas', 'Advanced analytics')}
            description={t('Padrões de foco, comparativos e metas', 'Focus patterns, comparisons and goals')}
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

