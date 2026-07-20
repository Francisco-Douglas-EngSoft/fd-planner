import { useState, useEffect } from 'react';
import { 
  Download, Calendar, TrendingUp, Clock, BookOpen, Target, FileText, 
  BarChart3, PieChart, Activity, Award, Flame, Timer, CheckCircle2,
  ArrowUp, ArrowDown, Minus, Brain, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { generateStudyReport } from '@/lib/pdfExport';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatHoursToHMS } from '@/lib/timeUtils';
import { AdvancedAnalytics } from '@/components/analytics/AdvancedAnalytics';

interface Course {
  id: string;
  name: string;
  category: string | null;
  total_hours: number;
  completed_hours: number;
  status: string | null;
}

interface FocusSession {
  id: string;
  duration_minutes: number;
  completed_at: string;
  session_type: string | null;
}

interface Task {
  id: string;
  status: string | null;
  completed_at: string | null;
  priority: string | null;
}

interface CleanStreak {
  current_streak: number;
  longest_streak: number;
  addiction_type: string;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--accent))',
];

export default function Reports() {
  const [period, setPeriod] = useState('weekly');
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [allFocusSessions, setAllFocusSessions] = useState<FocusSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [cleanStreaks, setCleanStreaks] = useState<CleanStreak[]>([]);
  const [stats, setStats] = useState({
    totalCourseHours: 0,
    completedCourseHours: 0,
    focusMinutes: 0,
    avgFocusDaily: 0,
    tasksCompleted: 0,
    tasksPending: 0,
    coursesProgress: 0,
    focusSessions: 0,
    streakDays: 0,
    longestStreak: 0,
  });
  const [previousStats, setPreviousStats] = useState({
    focusMinutes: 0,
    tasksCompleted: 0,
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'daily':
        return { start: subDays(now, 1), end: now };
      case 'weekly':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'yearly':
        return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) };
      default:
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    }
  };

  const getPreviousDateRange = () => {
    const { start, end } = getDateRange();
    const diff = differenceInDays(end, start) + 1;
    return {
      start: subDays(start, diff),
      end: subDays(end, diff),
    };
  };

  const fetchData = async () => {
    if (!user) return;

    const { start, end } = getDateRange();
    const prevRange = getPreviousDateRange();
    const startStr = start.toISOString();
    const endStr = end.toISOString();
    const prevStartStr = prevRange.start.toISOString();
    const prevEndStr = prevRange.end.toISOString();

    const [
      profileResult,
      coursesResult,
      tasksResult,
      focusResult,
      allTasksResult,
      allFocusResult,
      prevFocusResult,
      prevTasksResult,
      cleanStreaksResult,
    ] = await Promise.all([
      supabase.from('profiles').select('streak_days').eq('id', user.id).single(),
      supabase.from('courses').select('id, name, category, total_hours, completed_hours, status').eq('user_id', user.id),
      supabase.from('tasks').select('id, status, completed_at, priority').eq('user_id', user.id).gte('completed_at', startStr).lte('completed_at', endStr),
      supabase.from('focus_sessions').select('id, duration_minutes, completed_at, session_type').eq('user_id', user.id).gte('completed_at', startStr).lte('completed_at', endStr),
      supabase.from('tasks').select('id, status, completed_at, priority').eq('user_id', user.id),
      supabase.from('focus_sessions').select('id, duration_minutes, completed_at, session_type').eq('user_id', user.id),
      supabase.from('focus_sessions').select('duration_minutes').eq('user_id', user.id).eq('session_type', 'work').gte('completed_at', prevStartStr).lte('completed_at', prevEndStr),
      supabase.from('tasks').select('id').eq('user_id', user.id).eq('status', 'completed').gte('completed_at', prevStartStr).lte('completed_at', prevEndStr),
      supabase.from('clean_streaks').select('current_streak, longest_streak, addiction_type').eq('user_id', user.id),
    ]);

    const coursesList = coursesResult.data || [];
    const focusSessionsList = focusResult.data || [];
    const tasksList = tasksResult.data || [];
    const allTasksList = allTasksResult.data || [];
    const allFocusList = allFocusResult.data || [];
    
    const totalCourseHours = coursesList.reduce((sum, c) => sum + (c.total_hours || 0), 0);
    const completedCourseHours = coursesList.reduce((sum, c) => sum + (c.completed_hours || 0), 0);
    
    const periodFocusMinutes = focusSessionsList
      .filter(s => s.session_type === 'work')
      .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    
    const daysInPeriod = Math.max(1, differenceInDays(end, start) + 1);
    
    const prevFocusMinutes = (prevFocusResult.data || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const prevTasksCompleted = prevTasksResult.data?.length || 0;

    const maxStreak = Math.max(...(cleanStreaksResult.data || []).map(s => s.longest_streak || 0), 0);

    setCourses(coursesList);
    setFocusSessions(focusSessionsList);
    setAllFocusSessions(allFocusList);
    setTasks(tasksList);
    setAllTasks(allTasksList);
    setCleanStreaks(cleanStreaksResult.data || []);
    
    setStats({
      totalCourseHours,
      completedCourseHours,
      focusMinutes: periodFocusMinutes,
      avgFocusDaily: Math.round(periodFocusMinutes / daysInPeriod),
      tasksCompleted: tasksList.filter(t => t.status === 'completed').length,
      tasksPending: allTasksList.filter(t => t.status !== 'completed').length,
      coursesProgress: totalCourseHours > 0 ? Math.round((completedCourseHours / totalCourseHours) * 100) : 0,
      focusSessions: focusSessionsList.filter(s => s.session_type === 'work').length,
      streakDays: profileResult.data?.streak_days || 0,
      longestStreak: maxStreak,
    });

    setPreviousStats({
      focusMinutes: prevFocusMinutes,
      tasksCompleted: prevTasksCompleted,
    });
  };

  const handleExportPDF = async () => {
    if (!user) return;
    
    setIsExporting(true);
    
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const periodLabel = period === 'daily' ? 'Diário' : 
                         period === 'weekly' ? 'Semanal' : 
                         period === 'monthly' ? 'Mensal' : 'Anual';

      const pdfWeeklyData = weeklyFocusData.map(d => ({
        day: d.day,
        hours: d.foco,
        tasks: d.tarefas,
      }));

      generateStudyReport({
        userName: profileData?.full_name || user.email || 'Usuário',
        period: periodLabel,
        stats: {
          totalHours: Math.round(stats.focusMinutes / 60 * 10) / 10,
          avgDaily: Math.round(stats.avgFocusDaily / 60 * 10) / 10,
          tasksCompleted: stats.tasksCompleted,
          coursesProgress: stats.coursesProgress,
          focusSessions: stats.focusSessions,
          streakDays: stats.streakDays,
        },
        weeklyData: pdfWeeklyData,
        courses: courses.map(c => ({
          name: c.name,
          progress: c.total_hours > 0 ? Math.round((c.completed_hours / c.total_hours) * 100) : 0,
          hours: Math.max(0, c.total_hours - c.completed_hours),
        })),
      });

      toast({
        title: 'Relatório exportado!',
        description: 'O PDF foi baixado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: (error instanceof Error ? error.message : String(error)),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate change percentage
  const getChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const focusChange = getChange(stats.focusMinutes, previousStats.focusMinutes);
  const tasksChange = getChange(stats.tasksCompleted, previousStats.tasksCompleted);

  // Weekly focus data
  const weeklyFocusData = (() => {
    const { start, end } = getDateRange();
    const days = eachDayOfInterval({ start, end }).slice(0, 7);
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLabel = format(day, 'EEE', { locale: ptBR });
      
      const focusMins = focusSessions
        .filter(s => s.completed_at.startsWith(dayStr) && s.session_type === 'work')
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      
      const dayTasks = tasks
        .filter(t => t.completed_at?.startsWith(dayStr))
        .length;
      
      return {
        day: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        foco: Math.round(focusMins / 60 * 10) / 10,
        tarefas: dayTasks,
      };
    });
  })();

  // Course progress data
  const courseProgressData = courses
    .filter(c => c.status !== 'completed')
    .map(c => ({
      name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
      fullName: c.name,
      concluido: c.completed_hours || 0,
      restante: Math.max(0, (c.total_hours || 0) - (c.completed_hours || 0)),
      progresso: c.total_hours > 0 ? Math.round((c.completed_hours / c.total_hours) * 100) : 0,
    }))
    .sort((a, b) => b.progresso - a.progresso)
    .slice(0, 6);

  // Category distribution data
  const categoryData = (() => {
    const categoryMap: Record<string, number> = {};
    courses.forEach(course => {
      const cat = course.category || 'Sem Categoria';
      categoryMap[cat] = (categoryMap[cat] || 0) + (course.completed_hours || 0);
    });
    
    const total = Object.values(categoryMap).reduce((a, b) => a + b, 0);
    
    return Object.entries(categoryMap)
      .filter(([_, hours]) => hours > 0)
      .map(([name, hours], index) => ({
        name,
        value: Math.round((hours / total) * 100),
        hours,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  })();

  // Tasks by priority
  const tasksByPriority = (() => {
    const priorityMap: Record<string, { completed: number; pending: number }> = {
      high: { completed: 0, pending: 0 },
      normal: { completed: 0, pending: 0 },
      low: { completed: 0, pending: 0 },
    };
    
    allTasks.forEach(task => {
      const priority = task.priority || 'normal';
      if (task.status === 'completed') {
        priorityMap[priority].completed += 1;
      } else {
        priorityMap[priority].pending += 1;
      }
    });

    return [
      { name: 'Alta', concluidas: priorityMap.high.completed, pendentes: priorityMap.high.pending, color: 'hsl(var(--destructive))' },
      { name: 'Normal', concluidas: priorityMap.normal.completed, pendentes: priorityMap.normal.pending, color: 'hsl(var(--warning))' },
      { name: 'Baixa', concluidas: priorityMap.low.completed, pendentes: priorityMap.low.pending, color: 'hsl(var(--success))' },
    ];
  })();

  // Focus sessions by hour
  const focusByHour = (() => {
    const hourMap: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourMap[i] = 0;
    
    allFocusSessions
      .filter(s => s.session_type === 'work')
      .forEach(session => {
        const hour = new Date(session.completed_at).getHours();
        hourMap[hour] += session.duration_minutes;
      });

    return Object.entries(hourMap)
      .map(([hour, minutes]) => ({
        hour: `${hour}h`,
        minutos: minutes,
      }));
  })();

  // Monthly trend data
  const monthlyTrendData = (() => {
    const weeks = [1, 2, 3, 4];
    const now = new Date();
    const monthStart = startOfMonth(now);
    
    return weeks.map(week => {
      const weekStart = new Date(monthStart);
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekFocus = allFocusSessions
        .filter(s => {
          const sessionDate = parseISO(s.completed_at);
          return sessionDate >= weekStart && sessionDate <= weekEnd && s.session_type === 'work';
        })
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      
      const weekTasks = allTasks
        .filter(t => {
          if (!t.completed_at) return false;
          const taskDate = parseISO(t.completed_at);
          return taskDate >= weekStart && taskDate <= weekEnd;
        })
        .length;
      
      return {
        week: `Sem ${week}`,
        foco: Math.round(weekFocus / 60 * 10) / 10,
        tarefas: weekTasks,
        meta: 15,
      };
    });
  })();

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  };

  const ChangeIndicator = ({ value }: { value: number }) => {
    if (value > 0) {
      return (
        <div className="flex items-center gap-1 text-success">
          <ArrowUp className="h-3 w-3" />
          <span className="text-xs font-medium">+{value}%</span>
        </div>
      );
    } else if (value < 0) {
      return (
        <div className="flex items-center gap-1 text-destructive">
          <ArrowDown className="h-3 w-3" />
          <span className="text-xs font-medium">{value}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span className="text-xs font-medium">0%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-accent/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Análise de desempenho</p>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Relatórios</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Análise detalhada do seu desempenho e evolução
          </p>
        </div>
        <div className="relative flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="yearly">Anual</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Exportar PDF</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Horas Estudadas',
            value: formatHoursToHMS(stats.completedCourseHours),
            icon: BookOpen,
            tint: 'blue',
            footer: <p className="mt-1 text-[10px] text-muted-foreground">Módulos concluídos</p>,
          },
          {
            label: 'Tempo de Foco',
            value: formatTime(stats.focusMinutes),
            icon: Timer,
            tint: 'violet',
            footer: (
              <div className="mt-1 flex items-center gap-2">
                <ChangeIndicator value={focusChange} />
                <span className="text-[10px] text-muted-foreground">vs anterior</span>
              </div>
            ),
          },
          {
            label: 'Tarefas Concluídas',
            value: stats.tasksCompleted,
            icon: CheckCircle2,
            tint: 'emerald',
            footer: (
              <div className="mt-1 flex items-center gap-2">
                <ChangeIndicator value={tasksChange} />
                <span className="text-[10px] text-muted-foreground">vs anterior</span>
              </div>
            ),
          },
          {
            label: 'Progresso Cursos',
            value: `${stats.coursesProgress}%`,
            icon: TrendingUp,
            tint: 'orange',
            footer: <p className="mt-1 text-[10px] text-muted-foreground">{courses.length} cursos ativos</p>,
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <Card
              key={i}
              className="tint-card group relative overflow-hidden border bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5"
              style={{ ['--tint' as string]: `var(--tint-${card.tint})` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold font-display text-foreground">{card.value}</p>
                    {card.footer}
                  </div>
                  <div className="tint-icon rounded-lg p-2">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs for different report types */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
          <TabsList className="grid w-max sm:w-full grid-cols-6 h-auto gap-1 bg-muted/50 p-1 min-w-[480px] sm:min-w-0">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Visão</span>
              <span className="hidden sm:inline"> Geral</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Avançado</span>
            </TabsTrigger>
            <TabsTrigger value="focus" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
              <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Foco</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Cursos</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Tarefas</span>
            </TabsTrigger>
            <TabsTrigger value="habits" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
              <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Hábitos</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Weekly Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Performance Semanal
                </CardTitle>
                <CardDescription>Foco e tarefas por dia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={weeklyFocusData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" className="text-muted-foreground text-xs" />
                      <YAxis yAxisId="left" className="text-muted-foreground text-xs" />
                      <YAxis yAxisId="right" orientation="right" className="text-muted-foreground text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="foco" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Foco (h)" />
                      <Line yAxisId="right" type="monotone" dataKey="tarefas" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Tarefas" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  Tendência Mensal
                </CardTitle>
                <CardDescription>Evolução por semana</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrendData}>
                      <defs>
                        <linearGradient id="colorFoco" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="week" className="text-muted-foreground text-xs" />
                      <YAxis className="text-muted-foreground text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Area type="monotone" dataKey="foco" stroke="hsl(var(--primary))" fill="url(#colorFoco)" name="Foco (h)" />
                      <Line type="monotone" dataKey="meta" stroke="hsl(var(--chart-2))" strokeDasharray="5 5" name="Meta" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-accent" />
                  Distribuição por Categoria
                </CardTitle>
                <CardDescription>Horas estudadas por área</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name, props) => [`${props.payload.hours.toFixed(1)}h (${value}%)`, props.payload.name]}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Complete módulos para ver a distribuição
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Métricas Principais
                </CardTitle>
                <CardDescription>Resumo do seu desempenho</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-primary/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Média Diária</span>
                    </div>
                    <p className="text-xl font-bold text-primary">{formatTime(stats.avgFocusDaily)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-orange-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      <span className="text-xs text-muted-foreground">Sessões de Foco</span>
                    </div>
                    <p className="text-xl font-bold text-orange-500">{stats.focusSessions}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="h-4 w-4 text-destructive" />
                      <span className="text-xs text-muted-foreground">Sequência Atual</span>
                    </div>
                    <p className="text-xl font-bold text-destructive">{stats.streakDays} dias</p>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-success" />
                      <span className="text-xs text-muted-foreground">Tarefas Pendentes</span>
                    </div>
                    <p className="text-xl font-bold text-success">{stats.tasksPending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Focus Tab */}
        <TabsContent value="focus" className="space-y-6">
          <AdvancedAnalytics
            title="Análises avançadas de foco"
            description="Padrões, comparativos, distribuição e metas"
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Horas de Maior Produtividade</CardTitle>
                <CardDescription>Quando você mais se concentra</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={focusByHour}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="hour" className="text-muted-foreground text-xs" interval={2} />
                      <YAxis className="text-muted-foreground text-xs" />
                      <Tooltip
                        formatter={(value) => [`${value} min`, 'Tempo de Foco']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="minutos" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Foco</CardTitle>
                <CardDescription>Detalhes das sessões de foco</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <Timer className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total de Foco</p>
                        <p className="text-xs text-muted-foreground">No período selecionado</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold">{formatTime(stats.focusMinutes)}</p>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Sessões Completas</p>
                        <p className="text-xs text-muted-foreground">Pomodoros finalizados</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold">{stats.focusSessions}</p>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <TrendingUp className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Média Diária</p>
                        <p className="text-xs text-muted-foreground">Tempo médio por dia</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold">{formatTime(stats.avgFocusDaily)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Progresso por Curso</CardTitle>
                <CardDescription>Horas concluídas vs restantes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {courseProgressData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={courseProgressData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" className="text-muted-foreground text-xs" />
                        <YAxis type="category" dataKey="name" width={100} className="text-muted-foreground text-xs" />
                        <Tooltip
                          formatter={(value, name) => [formatHoursToHMS(Number(value)), name === 'concluido' ? 'Concluído' : 'Restante']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="concluido" stackId="a" fill="hsl(var(--success))" name="Concluído" />
                        <Bar dataKey="restante" stackId="a" fill="hsl(var(--muted))" name="Restante" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Adicione cursos para ver o progresso
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhes dos Cursos</CardTitle>
                <CardDescription>Lista de cursos ativos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {courses.filter(c => c.status !== 'completed').map((course) => {
                    const progress = course.total_hours > 0 
                      ? Math.round((course.completed_hours / course.total_hours) * 100) 
                      : 0;
                    return (
                      <div key={course.id} className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium truncate flex-1 mr-2">{course.name}</p>
                          <Badge variant={progress >= 75 ? 'default' : progress >= 50 ? 'secondary' : 'outline'}>
                            {progress}%
                          </Badge>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>{formatHoursToHMS(course.completed_hours)} concluídas</span>
                          <span>{formatHoursToHMS(course.total_hours)} total</span>
                        </div>
                      </div>
                    );
                  })}
                  {courses.filter(c => c.status !== 'completed').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum curso ativo
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tarefas por Prioridade</CardTitle>
                <CardDescription>Distribuição de tarefas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tasksByPriority}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-muted-foreground text-xs" />
                      <YAxis className="text-muted-foreground text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="concluidas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Concluídas" />
                      <Bar dataKey="pendentes" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Pendentes" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo de Tarefas</CardTitle>
                <CardDescription>Estatísticas gerais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-success/10 text-center">
                    <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                    <p className="text-2xl font-bold text-success">{stats.tasksCompleted}</p>
                    <p className="text-xs text-muted-foreground">Concluídas (período)</p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-500/10 text-center">
                    <Target className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-amber-500">{stats.tasksPending}</p>
                    <p className="text-xs text-muted-foreground">Pendentes (total)</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {tasksByPriority.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-medium">Prioridade {item.name}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-success font-medium">{item.concluidas}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-muted-foreground">{item.concluidas + item.pendentes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Habits Tab */}
        <TabsContent value="habits" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-destructive" />
                  Sequência de Estudos
                </CardTitle>
                <CardDescription>Mantenha sua consistência</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent mb-4">
                    <div className="text-white">
                      <p className="text-4xl font-bold">{stats.streakDays}</p>
                      <p className="text-xs">dias</p>
                    </div>
                  </div>
                  <p className="text-lg font-medium">Sequência Atual</p>
                  <p className="text-sm text-muted-foreground">Continue assim!</p>
                </div>

                <div className="flex justify-center gap-8">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{stats.longestStreak}</p>
                    <p className="text-xs text-muted-foreground">Maior sequência</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-success">{stats.focusSessions}</p>
                    <p className="text-xs text-muted-foreground">Sessões hoje</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-accent" />
                  AntiVício - Controle
                </CardTitle>
                <CardDescription>Seu progresso de recuperação</CardDescription>
              </CardHeader>
              <CardContent>
                {cleanStreaks.length > 0 ? (
                  <div className="space-y-4">
                    {cleanStreaks.map((streak, index) => (
                      <div key={index} className="p-4 rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium capitalize">{streak.addiction_type}</span>
                          <Badge variant={streak.current_streak >= 7 ? 'default' : 'secondary'}>
                            {streak.current_streak} dias
                          </Badge>
                        </div>
                        <Progress value={Math.min(100, (streak.current_streak / 30) * 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                          Recorde: {streak.longest_streak} dias
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Nenhum hábito sendo monitorado</p>
                    <p className="text-xs mt-1">Configure no módulo AntiVício</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
