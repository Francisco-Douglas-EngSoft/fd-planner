import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Coffee, Brain, Settings, Target, Clock, BookOpen, Zap, TrendingUp, Timer, Sparkles, Square, CheckCircle2, Volume2, VolumeX, Calendar, GraduationCap, Filter, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { usePomodoroTimer } from '@/hooks/usePomodoroTimer';
import { useFocusSounds } from '@/hooks/useFocusSounds';
import { TimerSettingsDialog } from '@/components/focus/TimerSettingsDialog';
import { DigitalClock } from '@/components/focus/DigitalClock';
import { FocusImpulseButton } from '@/components/antivicio/FocusImpulseButton';
import { TodaySessionsHistory } from '@/components/focus/TodaySessionsHistory';
import { FocusStreak } from '@/components/focus/FocusStreak';
import { TimerCompletionEffect } from '@/components/focus/TimerCompletionEffect';
import { BreakTransitionCard } from '@/components/focus/BreakTransitionCard';
import { FocusGoalsPanel } from '@/components/focus/FocusGoalsPanel';
import { DailyAgenda } from '@/components/focus/DailyAgenda';
import { MotivationalQuote } from '@/components/focus/MotivationalQuote';
import { PaceIndicatorCard } from '@/components/focus/PaceIndicatorCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatSecondsToHMS, formatMinutesToHMS, formatHoursToHMS } from '@/lib/timeUtils';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeFocusSessions } from '@/hooks/useRealtimeFocusSessions';

interface Course {
  id: string;
  name: string;
  total_hours: number;
  completed_hours?: number;
  category?: string | null;
}

interface StudyPlan {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  daily_hours: number;
  study_days: string[];
  total_hours: number;
  planning_category: string;
  semester?: string | null;
  study_plan_courses?: StudyPlanCourse[];
}

interface StudyPlanCourse {
  id: string;
  course_id: string;
  allocated_hours: number | null;
  is_fixed: boolean | null;
  study_days: string[] | null;
  sequence_order: number | null;
  is_completed: boolean | null;
  study_plan: {
    id: string;
    name: string;
    daily_hours: number | null;
    study_days: string[] | null;
    start_date: string;
    end_date: string;
    planning_category?: string;
  };
  courses?: {
    id: string;
    name: string;
    total_hours: number;
    completed_hours?: number;
    category?: string | null;
  };
}

const dayIdMap: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export default function Focus() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [todayCourses, setTodayCourses] = useState<Course[]>([]);
  const [studyPlanCourses, setStudyPlanCourses] = useState<StudyPlanCourse[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [todayPlans, setTodayPlans] = useState<StudyPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPlanCourse, setCurrentPlanCourse] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [targetCycles, setTargetCycles] = useState<number>(() => {
    const saved = localStorage.getItem('fdplanner_target_cycles');
    return saved ? Number.parseInt(saved, 10) : 4;
  });

  // Persist targetCycles to localStorage
  useEffect(() => {
    localStorage.setItem('fdplanner_target_cycles', targetCycles.toString());
  }, [targetCycles]);
  const [showCourseChangeDialog, setShowCourseChangeDialog] = useState(false);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [todayStudiedMinutes, setTodayStudiedMinutes] = useState<number>(0);
  const [weekStudiedMinutes, setWeekStudiedMinutes] = useState<number>(0);
  const [todayCompletedCycles, setTodayCompletedCycles] = useState<number>(0);
  const [paceActualHours, setPaceActualHours] = useState<number>(0);
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);
  const [showGoalCompletionEffect, setShowGoalCompletionEffect] = useState(false);
  const [showBreakTransition, setShowBreakTransition] = useState(false);
  const [previousSessions, setPreviousSessions] = useState(0);
  const [hasShownDailyGoalCelebration, setHasShownDailyGoalCelebration] = useState(false);
  const [hasShownCyclesCelebration, setHasShownCyclesCelebration] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const {
    selectedSound,
    setSelectedSound,
    isMuted,
    setIsMuted,
    playSound,
    playSuccessSound,
    soundOptions,
  } = useFocusSounds();
  
  const {
    mode,
    timeLeft,
    isRunning,
    sessions,
    preset,
    progress,
    selectedCourse,
    setSelectedCourse,
    selectedModule,
    setSelectedModule,
    toggleTimer,
    resetTimer,
    stopAndSave,
    addTime,
    setCustomTime,
    changePreset,
    changeMode,
    presets,
    updatePreset,
    addCustomPreset,
    removePreset,
    currentElapsedMinutes,
    pendingBreak,
    startPendingBreakAndRun,
    skipPendingBreak,
    settings,
    setSettings,
  } = usePomodoroTimer();

  const MANUAL_DAILY_GOAL_KEY_PREFIX = 'fdplanner_manual_daily_goal_hours:';
  const [manualDailyHours, setManualDailyHours] = useState<string>('');

  useEffect(() => {
    if (!selectedCourse) {
      setManualDailyHours('');
      return;
    }
    const saved = localStorage.getItem(`${MANUAL_DAILY_GOAL_KEY_PREFIX}${selectedCourse}`);
    setManualDailyHours(saved ?? '');
  }, [selectedCourse]);

  // Show break transition only when a break is pending (user must confirm start)
  useEffect(() => {
    if (pendingBreak && !isRunning) {
      setShowBreakTransition(true);
    }
  }, [pendingBreak, isRunning]);

  // Play sound and show effect when session completes
  useEffect(() => {
    if (sessions > previousSessions && previousSessions > 0) {
      playSound();
      setShowCompletionEffect(true);
    }
    setPreviousSessions(sessions);
  }, [sessions, previousSessions, playSound]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          toggleTimer();
          break;
        case 'KeyR':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            resetTimer();
          }
          break;
        case 'KeyS':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            stopAndSave();
          }
          break;
        case 'KeyM':
          e.preventDefault();
          setIsMuted(!isMuted);
          break;
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [toggleTimer, resetTimer, stopAndSave, isMuted, setIsMuted]);

  // Fetch today's studied time and completed cycles for selected course
  const fetchTodayStudiedTime = useCallback(async () => {
    if (!user || !selectedCourse) {
      setTodayStudiedMinutes(0);
      setTodayCompletedCycles(0);
      return;
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const { data } = await supabase
      .from('focus_sessions')
      .select('duration_minutes')
      .eq('user_id', user.id)
      .eq('course_id', selectedCourse)
      .gte('completed_at', startOfDay)
      .lt('completed_at', endOfDay);

    if (data) {
      const total = data.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
      setTodayStudiedMinutes(total);
      // Count completed cycles (each session is considered a cycle)
      setTodayCompletedCycles(data.length);
    }
  }, [user, selectedCourse]);

  // Fetch this week's studied time (Monday 00:00 -> next Monday 00:00) for the selected course
  const fetchWeekStudiedTime = useCallback(async () => {
    if (!user || !selectedCourse) {
      setWeekStudiedMinutes(0);
      return;
    }
    const now = new Date();
    // Monday as start of week (getDay: 0=Sun..6=Sat)
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7; // days since Monday
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    const nextMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);

    const { data } = await supabase
      .from('focus_sessions')
      .select('duration_minutes')
      .eq('user_id', user.id)
      .eq('course_id', selectedCourse)
      .gte('completed_at', monday.toISOString())
      .lt('completed_at', nextMonday.toISOString());

    if (data) {
      const total = data.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      setWeekStudiedMinutes(total);
    }
  }, [user, selectedCourse]);

  useEffect(() => {
    if (user) {
      fetchCourses();
      fetchStudyPlanCourses();
      fetchStudyPlans();
    }
  }, [user]);

  // Aplica curso pré-selecionado vindo do dialog de cronograma do plano (Iniciar foco no módulo)
  useEffect(() => {
    if (!user || courses.length === 0) return;
    try {
      const targetCourseId = localStorage.getItem('fdplanner_selected_course');
      if (targetCourseId && courses.some(c => c.id === targetCourseId)) {
        setSelectedCourse(targetCourseId);
        localStorage.removeItem('fdplanner_selected_course');
        const moduleId = localStorage.getItem('fdplanner_focus_target_module');
        if (moduleId) {
          // Persiste no hook para que a sessão de foco grave module_id
          setSelectedModule(moduleId);
          toast({
            title: 'Foco no módulo iniciado',
            description: 'Sessões de foco serão registradas neste módulo.',
          });
          localStorage.removeItem('fdplanner_focus_target_module');
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, courses]);

  // Fetch studied time when course changes
  useEffect(() => {
    fetchTodayStudiedTime();
    fetchWeekStudiedTime();
  }, [fetchTodayStudiedTime, fetchWeekStudiedTime]);

  // Realtime: refreshKey global incrementa quando uma focus_session ou course muda
  const focusRefreshKey = useRealtimeFocusSessions(user?.id);

  // Refaz fetches sempre que houver atividade em focus_sessions/courses
  useEffect(() => {
    if (!user) return;
    fetchTodayStudiedTime();
    fetchWeekStudiedTime();
    fetchCourses();
    fetchStudyPlans(); // Atualiza lista de planos para ocultar os que completaram a meta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRefreshKey, user]);

  const fetchCourses = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('courses')
      .select('id, name, total_hours, category')
      .eq('user_id', user.id)
      .order('name');
    
    if (data) {
      setCourses(data);
    }
  };

  const fetchStudyPlans = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('study_plans')
      .select(`
        *,
        study_plan_courses (
          *,
          courses (id, name, total_hours, completed_hours, category)
        )
      `)
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching study plans:', error);
      return;
    }
    
    if (data) {
      setStudyPlans(data as any);
      
      // Filtrar planos ativos hoje
      const today = new Date().toISOString().split('T')[0];
      const todayDayId = dayIdMap[new Date().getDay()];
      
      // Buscar sessões de foco de hoje para calcular progresso
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data: todaySessions } = await supabase
        .from('focus_sessions')
        .select('course_id, duration_minutes')
        .eq('user_id', user.id)
        .gte('completed_at', startOfDay.toISOString())
        .lte('completed_at', endOfDay.toISOString());
      
      // Criar mapa de minutos estudados por curso hoje
      const studiedMinutesByCourse: Record<string, number> = {};
      if (todaySessions) {
        todaySessions.forEach(session => {
          if (session.course_id) {
            studiedMinutesByCourse[session.course_id] = 
              (studiedMinutesByCourse[session.course_id] || 0) + (session.duration_minutes || 0);
          }
        });
      }
      
      const activePlans = data.filter(plan => {
        const isInPeriod = plan.start_date <= today && plan.end_date >= today;
        const isStudyDay = plan.study_days?.includes(todayDayId);
        const hasActiveCourses = plan.study_plan_courses?.some(pc => !pc.is_completed);
        
        if (!isInPeriod || !isStudyDay || !hasActiveCourses) {
          return false;
        }
        
        // Verificar se o plano completou a meta diária
        const dailyHours = plan.daily_hours || 0;
        const dailyGoalMinutes = dailyHours * 60;
        
        if (dailyGoalMinutes <= 0) {
          return true; // Se não tem meta, sempre mostra
        }
        
        // Calcular total estudado hoje nos cursos deste plano
        let totalStudiedMinutes = 0;
        plan.study_plan_courses?.forEach(pc => {
          if (pc.course_id && studiedMinutesByCourse[pc.course_id]) {
            totalStudiedMinutes += studiedMinutesByCourse[pc.course_id];
          }
        });
        
        // Ocultar se já completou a meta diária
        const hasCompletedDailyGoal = totalStudiedMinutes >= dailyGoalMinutes;
        return !hasCompletedDailyGoal;
      });
      
      setTodayPlans(activePlans as any);
      
      // Auto-selecionar primeiro plano ativo ou restaurar do localStorage
      const savedPlan = localStorage.getItem('fdplanner_selected_plan');
      if (savedPlan && data.some(p => p.id === savedPlan)) {
        handlePlanChange(savedPlan);
      } else if (activePlans.length > 0 && !selectedPlan) {
        handlePlanChange(activePlans[0].id);
      }
    }
  };

  const fetchStudyPlanCourses = async () => {
    if (!user) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayDayId = dayIdMap[today.getDay()];

    const { data } = await supabase
      .from('study_plan_courses')
      .select(`
        id,
        course_id,
        allocated_hours,
        is_fixed,
        study_days,
        sequence_order,
        is_completed,
        study_plan_id,
        study_plan:study_plans!inner (
          id,
          name,
          daily_hours,
          study_days,
          start_date,
          end_date,
          user_id,
          planning_category
        )
      `)
      .eq('study_plan.user_id', user.id);

    if (data) {
      setStudyPlanCourses(data as unknown as StudyPlanCourse[]);
      
      const courseIdsFromActivePlans = new Set<string>();
      
      (data as unknown as StudyPlanCourse[]).forEach(pc => {
        const plan = pc.study_plan;
        if (!plan) return;

        // Plano precisa estar ativo hoje pelo intervalo de datas
        if (plan.start_date > todayStr || plan.end_date < todayStr) return;

        // Verifica se hoje é um dia de estudo para este curso / plano
        const planStudyDays = plan.study_days || [];
        const courseStudyDays = pc.study_days && pc.study_days.length > 0 ? pc.study_days : planStudyDays;

        if (courseStudyDays && courseStudyDays.length > 0 && !courseStudyDays.includes(todayDayId)) {
          return;
        }

        courseIdsFromActivePlans.add(pc.course_id);
      });
      
      if (courseIdsFromActivePlans.size > 0) {
        const { data: courseData } = await supabase
          .from('courses')
          .select('id, name, total_hours, category')
          .in('id', Array.from(courseIdsFromActivePlans));
        
        if (courseData) {
          setTodayCourses(courseData);
        }
      } else {
        setTodayCourses([]);
      }
    }
  };

  const courseDailyInfo = useMemo(() => {
    if (!selectedCourse) return null;

    const candidates = studyPlanCourses.filter((pc) => pc.course_id === selectedCourse);
    const hasPlan = candidates.length > 0;

    const today = new Date();
    const todayTime = today.getTime();

    const pickBestPlan = () => {
      const scored = candidates
        .map((pc) => {
          const start = new Date(`${pc.study_plan.start_date}T00:00:00`).getTime();
          const end = new Date(`${pc.study_plan.end_date}T23:59:59`).getTime();
          const isActive = start <= todayTime && todayTime <= end;
          const isUpcoming = todayTime < start;
          return { pc, start, end, isActive, isUpcoming };
        })
        .sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          if (a.isUpcoming !== b.isUpcoming) return a.isUpcoming ? -1 : 1;
          if (a.isUpcoming && b.isUpcoming) return a.start - b.start;
          return b.start - a.start;
        });

      return scored[0]?.pc ?? null;
    };

    if (hasPlan) {
      const planCourse = pickBestPlan();
      if (!planCourse) return null;

      // Respeita os dias de estudo definidos no plano/curso
      const todayDayId = dayIdMap[new Date().getDay()];
      const planStudyDays = planCourse.study_plan?.study_days || [];
      const courseStudyDays =
        (planCourse.study_days && planCourse.study_days.length > 0
          ? planCourse.study_days
          : planStudyDays) || [];

      if (courseStudyDays.length > 0 && !courseStudyDays.includes(todayDayId)) {
        // Hoje não é um dia de estudo previsto para este curso no plano
        return null;
      }

      const rawDailyHours = planCourse.study_plan?.daily_hours;
      const planDailyHours = typeof rawDailyHours === 'number' ? rawDailyHours : Number(rawDailyHours);

      if (!Number.isFinite(planDailyHours) || planDailyHours <= 0) return null;

      const dailyMinutes = planDailyHours * 60;

      return {
        dailyHours: planDailyHours,
        dailyMinutes,
        allocatedHours: planCourse.allocated_hours || 0,
        planStartDate: planCourse.study_plan.start_date,
        planEndDate: planCourse.study_plan.end_date,
        planCourseId: planCourse.id,
        planStudyDays:
          (planCourse.study_days && planCourse.study_days.length > 0
            ? planCourse.study_days
            : planCourse.study_plan?.study_days) || [],
        source: 'plan' as const,
      };
    }

    // Foco sem plano: meta diária manual por curso (salva no localStorage)
    const manual = Number(manualDailyHours);
    if (!Number.isFinite(manual) || manual <= 0) return null;

    return {
      dailyHours: manual,
      dailyMinutes: manual * 60,
      allocatedHours: 0,
      planStartDate: null,
      planEndDate: null,
      planStudyDays: [] as string[],
      source: 'manual' as const,
    };
  }, [selectedCourse, studyPlanCourses, manualDailyHours]);

  // Pace info: independente de "hoje ser dia de estudo", para sempre exibir o Ritmo do Curso quando houver plano.
  const paceCourseInfo = useMemo(() => {
    if (!selectedCourse) return null;
    const candidates = studyPlanCourses.filter((pc) => pc.course_id === selectedCourse);
    if (candidates.length === 0) return null;

    const todayTime = new Date().getTime();
    const scored = candidates
      .map((pc) => {
        const start = new Date(`${pc.study_plan.start_date}T00:00:00`).getTime();
        const end = new Date(`${pc.study_plan.end_date}T23:59:59`).getTime();
        const isActive = start <= todayTime && todayTime <= end;
        const isUpcoming = todayTime < start;
        return { pc, start, end, isActive, isUpcoming };
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        if (a.isUpcoming !== b.isUpcoming) return a.isUpcoming ? -1 : 1;
        if (a.isUpcoming && b.isUpcoming) return a.start - b.start;
        return b.start - a.start;
      });
    const planCourse = scored[0]?.pc;
    if (!planCourse) return null;

    const rawDailyHours = planCourse.study_plan?.daily_hours;
    const planDailyHours = typeof rawDailyHours === 'number' ? rawDailyHours : Number(rawDailyHours);
    if (!Number.isFinite(planDailyHours) || planDailyHours <= 0) return null;

    return {
      dailyHours: planDailyHours,
      planStartDate: planCourse.study_plan.start_date,
      planEndDate: planCourse.study_plan.end_date,
      planCourseId: planCourse.id,
      planStudyDays:
        (planCourse.study_days && planCourse.study_days.length > 0
          ? planCourse.study_days
          : planCourse.study_plan?.study_days) || [],
    };
  }, [selectedCourse, studyPlanCourses]);

  // Soma horas estudadas neste curso DESDE a data de início do plano (para o Pace Indicator)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user || !selectedCourse || !paceCourseInfo?.planStartDate) {
        if (!cancelled) setPaceActualHours(0);
        return;
      }
      const startISO = new Date(`${paceCourseInfo.planStartDate}T00:00:00`).toISOString();
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .eq('course_id', selectedCourse)
        .gte('completed_at', startISO);
      if (cancelled) return;
      if (error || !data) {
        setPaceActualHours(0);
        return;
      }
      const totalMin = data.reduce((s, r) => s + (r.duration_minutes || 0), 0);
      setPaceActualHours(totalMin / 60);
    };
    run();
    return () => { cancelled = true; };
  }, [user, selectedCourse, paceCourseInfo?.planStartDate, focusRefreshKey]);

  const hasPlanForSelectedCourse = useMemo(() => {
    if (!selectedCourse) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return studyPlanCourses.some((pc) => {
      if (pc.course_id !== selectedCourse) return false;
      const plan = pc.study_plan;
      if (!plan) return false;
      // Considera apenas planos ainda ativos (hoje dentro do intervalo)
      return plan.start_date <= todayStr && plan.end_date >= todayStr;
    });
  }, [selectedCourse, studyPlanCourses]);

  // Calculate studied and remaining time (including real-time elapsed time)
  const dailyProgressInfo = useMemo(() => {
    if (!courseDailyInfo) return null;

    const dailyGoalMinutes = courseDailyInfo.dailyMinutes;
    
    // Include current session elapsed time when timer is running in work mode
    const currentSessionMinutes = (isRunning && mode === 'work') ? currentElapsedMinutes : 0;
    const studiedMinutes = todayStudiedMinutes + currentSessionMinutes;
    
    const remainingMinutes = Math.max(0, dailyGoalMinutes - studiedMinutes);
    const progressPercent = Math.min(100, (studiedMinutes / dailyGoalMinutes) * 100);
    const isCompleted = studiedMinutes >= dailyGoalMinutes;

    return {
      dailyGoalMinutes,
      studiedMinutes,
      remainingMinutes,
      progressPercent,
      isCompleted,
      savedMinutes: todayStudiedMinutes, // Keep track of saved minutes separately
    };
  }, [courseDailyInfo, todayStudiedMinutes, isRunning, mode, currentElapsedMinutes]);

  // Weekly goal: sum of dailyHours for each configured study day in the current week.
  // Resets every Monday 00:00 (week starts Monday).
  const weeklyProgressInfo = useMemo(() => {
    if (!courseDailyInfo) return null;
    const dailyHours = courseDailyInfo.dailyHours || 0;
    if (dailyHours <= 0) return null;

    const studyDays = courseDailyInfo.planStudyDays && courseDailyInfo.planStudyDays.length > 0
      ? courseDailyInfo.planStudyDays
      : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const studyDaysCount = studyDays.length;
    const weeklyGoalMinutes = studyDaysCount * dailyHours * 60;

    const currentSessionMinutes = (isRunning && mode === 'work') ? currentElapsedMinutes : 0;
    const studiedMinutes = weekStudiedMinutes + currentSessionMinutes;
    const remainingMinutes = Math.max(0, weeklyGoalMinutes - studiedMinutes);
    const progressPercent = weeklyGoalMinutes > 0
      ? Math.min(100, (studiedMinutes / weeklyGoalMinutes) * 100)
      : 0;
    const isCompleted = weeklyGoalMinutes > 0 && studiedMinutes >= weeklyGoalMinutes;

    return {
      weeklyGoalMinutes,
      studiedMinutes,
      remainingMinutes,
      progressPercent,
      isCompleted,
      studyDaysCount,
      dailyHours,
    };
  }, [courseDailyInfo, weekStudiedMinutes, isRunning, mode, currentElapsedMinutes]);

  const cyclesInfo = useMemo(() => {
    if (!courseDailyInfo || targetCycles <= 0) return null;

    // Use remaining time instead of full daily goal
    const remainingMinutes = dailyProgressInfo 
      ? dailyProgressInfo.remainingMinutes 
      : courseDailyInfo.dailyMinutes;
    
    // If already completed daily goal, use minimum cycle time
    if (remainingMinutes <= 0) {
      return {
        totalMinutesPerDay: courseDailyInfo.dailyMinutes,
        remainingMinutes: 0,
        cyclesNeeded: 0,
        workMinutesPerCycle: 25, // Default pomodoro
        breakMinutesPerCycle: 5,
        totalCycleTime: 30,
        totalWorkTime: 0,
        totalBreakTime: 0,
        isCompleted: true,
      };
    }

    const workMinutesPerCycle = remainingMinutes / targetCycles;
    const breakMinutesPerCycle = workMinutesPerCycle * 0.25;

    return {
      totalMinutesPerDay: courseDailyInfo.dailyMinutes,
      remainingMinutes,
      cyclesNeeded: targetCycles,
      workMinutesPerCycle,
      breakMinutesPerCycle,
      totalCycleTime: workMinutesPerCycle + breakMinutesPerCycle,
      totalWorkTime: remainingMinutes,
      totalBreakTime: breakMinutesPerCycle * targetCycles,
      isCompleted: false,
    };
  }, [courseDailyInfo, targetCycles, dailyProgressInfo]);

  // Celebrate when daily goal is completed
  useEffect(() => {
    if (dailyProgressInfo?.isCompleted && !hasShownDailyGoalCelebration && todayStudiedMinutes > 0) {
      setHasShownDailyGoalCelebration(true);
      setShowGoalCompletionEffect(true);
      playSuccessSound();
      toast({
        title: "🎉 Meta Diária Atingida!",
        description: `Parabéns! Você completou sua meta de ${formatMinutesToHMS(dailyProgressInfo.dailyGoalMinutes)} de estudo hoje!`,
      });
    }
  }, [dailyProgressInfo?.isCompleted, hasShownDailyGoalCelebration, todayStudiedMinutes, playSuccessSound, toast, dailyProgressInfo?.dailyGoalMinutes]);

  // Celebrate when all cycles are completed
  useEffect(() => {
    if (todayCompletedCycles >= targetCycles && targetCycles > 0 && !hasShownCyclesCelebration && todayCompletedCycles > 0) {
      setHasShownCyclesCelebration(true);
      if (!dailyProgressInfo?.isCompleted) {
        setShowGoalCompletionEffect(true);
        playSuccessSound();
        toast({
          title: "🏆 Todos os Ciclos Completos!",
          description: `Você completou ${targetCycles} ciclos de foco hoje!`,
        });
      }
    }
  }, [todayCompletedCycles, targetCycles, hasShownCyclesCelebration, dailyProgressInfo?.isCompleted, playSuccessSound, toast]);

  // Reset celebration flags when course changes
  useEffect(() => {
    setHasShownDailyGoalCelebration(false);
    setHasShownCyclesCelebration(false);
  }, [selectedCourse]);

  // Only set custom time when cyclesInfo changes, NOT when isRunning changes (pausing).
  // We use a ref to track the previous cyclesInfo key so we only fire on actual plan/cycle changes.
  const prevCyclesKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!cyclesInfo || isRunning) return;
    
    // Create a key that represents the current cycle configuration
    const cyclesKey = `${cyclesInfo.workMinutesPerCycle.toFixed(2)}-${cyclesInfo.remainingMinutes.toFixed(2)}-${cyclesInfo.cyclesNeeded}`;
    
    // Only update if the cycle configuration actually changed
    if (cyclesKey === prevCyclesKeyRef.current) return;
    prevCyclesKeyRef.current = cyclesKey;
    
    const workSeconds = Math.round(cyclesInfo.workMinutesPerCycle * 60);
    if (workSeconds > 0) {
      setCustomTime(workSeconds, 'work');
    }
  }, [cyclesInfo, setCustomTime, isRunning]);

  const selectedCourseName = useMemo(() => {
    if (!selectedCourse) return null;
    const course = todayCourses.find(c => c.id === selectedCourse) || courses.find(c => c.id === selectedCourse);
    return course?.name || null;
  }, [selectedCourse, todayCourses, courses]);

  // Available categories from all plans
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    studyPlans.forEach(p => {
      if (p.planning_category) cats.add(p.planning_category);
    });
    return Array.from(cats).sort();
  }, [studyPlans]);

  // Filtered plans based on category filter
  const filteredTodayPlans = useMemo(() => {
    if (categoryFilter === 'all') return todayPlans;
    return todayPlans.filter(p => p.planning_category === categoryFilter);
  }, [todayPlans, categoryFilter]);

  const filteredAllPlans = useMemo(() => {
    if (categoryFilter === 'all') return studyPlans;
    return studyPlans.filter(p => p.planning_category === categoryFilter);
  }, [studyPlans, categoryFilter]);

  // Get current course from a study plan
  const getCurrentPlanCourse = (plan: StudyPlan): string | null => {
    if (!plan.study_plan_courses || plan.study_plan_courses.length === 0) {
      return null;
    }
    
    // Ordenar por sequence_order
    const sortedCourses = [...plan.study_plan_courses].sort(
      (a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)
    );
    
    // Encontrar primeiro curso não concluído
    const currentCourse = sortedCourses.find(pc => !pc.is_completed);
    
    return currentCourse?.courses?.id || sortedCourses[0]?.courses?.id || null;
  };

  // Handle plan change
  const handlePlanChange = (planId: string) => {
    if (isRunning) {
      // Se timer está rodando, não muda o plano
      toast({
        title: "Timer em execução",
        description: "Pare o timer antes de mudar de planejamento.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedPlan(planId);
    localStorage.setItem('fdplanner_selected_plan', planId);
    
    const plan = studyPlans.find(p => p.id === planId);
    if (plan) {
      const courseId = getCurrentPlanCourse(plan);
      if (courseId) {
        setCurrentPlanCourse(courseId);
        setSelectedCourse(courseId); // Para compatibilidade com timer
      }
    }
  };

  const handleSaveAndChangeCourse = async () => {
    if (pendingCourseId) {
      const minutes = await stopAndSave();
      const minuteText = `${minutes} minuto${minutes > 1 ? 's' : ''} de foco registrado`;
      const courseText = selectedCourseName ? ` em ${selectedCourseName}` : '';
      const descriptionText = `${minuteText}${courseText}.`;
      if (minutes && minutes >= 1) {
        toast({
          title: "Sessão salva!",
          description: descriptionText,
        });
      }
      setSelectedCourse(pendingCourseId);
      setPendingCourseId(null);
      setShowCourseChangeDialog(false);
    }
  };

  const handleDiscardAndChangeCourse = () => {
    if (pendingCourseId) {
      resetTimer();
      setSelectedCourse(pendingCourseId);
      setPendingCourseId(null);
      setShowCourseChangeDialog(false);
    }
  };

  // Handle break transition actions
  const handleStartBreak = () => {
    setShowBreakTransition(false);
    // Start break atomically to avoid starting with stale timeLeft.
    startPendingBreakAndRun();
  };

  const handleSkipBreak = () => {
    setShowBreakTransition(false);
    skipPendingBreak();
  };

  // Handle start session from Daily Agenda
  const handleStartFromAgenda = useCallback((courseId: string, durationMinutes: number) => {
    // If timer is running with a different course, just select without starting
    if (isRunning && courseId !== selectedCourse) {
      setPendingCourseId(courseId);
      setShowCourseChangeDialog(true);
      return;
    }

    // Select the course
    setSelectedCourse(courseId);

    // Set custom time for the session (in work mode)
    const durationSeconds = durationMinutes * 60;
    setCustomTime(durationSeconds, 'work');

    // Optionally auto-start if not running
    if (!isRunning) {
      // Small delay to ensure state is updated before starting
      setTimeout(() => {
        toggleTimer();
      }, 100);
    }
  }, [isRunning, selectedCourse, setSelectedCourse, setCustomTime, toggleTimer]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen bg-background pb-6"
    >
      {/* Break Transition Card */}
      <BreakTransitionCard
        isVisible={showBreakTransition}
        mode={pendingBreak?.mode === 'longBreak' ? 'longBreak' : 'break'}
        breakTimeSeconds={pendingBreak?.seconds ?? 0}
        completedSessions={sessions}
        onStartBreak={handleStartBreak}
        onSkipBreak={handleSkipBreak}
      />

      {/* Completion Effects */}
      <TimerCompletionEffect 
        trigger={showCompletionEffect} 
        onComplete={() => setShowCompletionEffect(false)} 
      />
      <TimerCompletionEffect 
        trigger={showGoalCompletionEffect} 
        onComplete={() => setShowGoalCompletionEffect(false)} 
      />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative p-2.5 rounded-2xl bg-gradient-primary shadow-lg">
              <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-background animate-pulse" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display tracking-tight truncate">
                Modo Foco
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block mt-0.5">
                Técnica Pomodoro · Máxima produtividade
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DigitalClock />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                "h-9 w-9 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/60",
                isMuted && "text-muted-foreground"
              )}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowSettings(true)} 
              className="h-9 w-9 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/60"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ─── Streak ─── */}
        <div className="mb-6">
          <FocusStreak />
        </div>

        {/* ─── Pace Indicator (if course selected with plan) ─── */}
        {(() => {
          const courseObj = selectedCourse
            ? (courses.find(c => c.id === selectedCourse) || todayCourses.find(c => c.id === selectedCourse))
            : null;
          const showPace = !!(
            selectedCourse &&
            courseObj &&
            paceCourseInfo?.planStartDate
          );
          const liveHours = paceActualHours + ((isRunning && mode === 'work') ? currentElapsedMinutes / 60 : 0);

          return showPace && courseObj && paceCourseInfo?.planStartDate ? (
            <div className="mb-6">
              <PaceIndicatorCard
                courseName={courseObj.name}
                startDate={paceCourseInfo.planStartDate}
                dailyHours={paceCourseInfo.dailyHours}
                studyDays={paceCourseInfo.planStudyDays}
                actualHours={liveHours}
                userId={user?.id}
                courseId={selectedCourse}
                planCourseId={paceCourseInfo.planCourseId}
                refreshKey={focusRefreshKey}
                onStudyDaysUpdated={fetchStudyPlanCourses}
              />
            </div>
          ) : null;
        })()}

      {/* ─── Main Grid ─── */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* ─── Timer Section ─── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Timer Card */}
          <Card className="overflow-hidden border-0 shadow-2xl rounded-2xl">
            <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.7 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className={cn(
                "relative p-8 md:p-12 transition-colors duration-500",
                mode === 'work' && "bg-gradient-to-br from-primary via-primary/90 to-primary/80",
                mode === 'break' && "bg-gradient-to-br from-accent via-accent/90 to-accent/80",
                mode === 'longBreak' && "bg-gradient-to-br from-success via-success/90 to-success/80"
              )}
            >
              <div className="relative text-center text-white space-y-6">
                {/* Course Badge */}
                <AnimatePresence mode="wait">
                {selectedCourseName && (
                  <motion.div
                    key={selectedCourseName}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-center"
                  >
                    <Badge 
                      variant="secondary" 
                      className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-1.5 text-sm max-w-[280px] truncate rounded-full"
                    >
                      <BookOpen className="h-3.5 w-3.5 mr-2 shrink-0" />
                      <span className="truncate">{selectedCourseName}</span>
                    </Badge>
                  </motion.div>
                )}
                </AnimatePresence>

                {/* Mode Indicator */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-semibold tracking-wider uppercase opacity-90">
                    {mode === 'work' && '⚡ FOCO TOTAL'}
                    {mode === 'break' && '☕ PAUSA CURTA'}
                    {mode === 'longBreak' && '🌟 PAUSA LONGA'}
                  </span>
                </div>

                {/* Cycle Dots */}
                {selectedCourse && targetCycles > 0 && (
                  <div className="flex items-center justify-center gap-2">
                    {Array.from({ length: targetCycles }).map((_, index) => {
                      const isCompleted = index < todayCompletedCycles;
                      const isCurrent = index === todayCompletedCycles && isRunning;
                      return (
                        <div
                          key={`cycle-${selectedCourse}-${index}`}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all duration-300",
                            isCompleted && "bg-white scale-125",
                            isCurrent && "bg-white/60 animate-pulse",
                            !isCompleted && !isCurrent && "bg-white/20"
                          )}
                        />
                      );
                    })}
                    <span className="ml-2 text-xs opacity-70 tabular-nums">
                      {todayCompletedCycles}/{targetCycles}
                    </span>
                  </div>
                )}

                {/* Timer Circle */}
                <div className="relative py-6">
                  <div className="text-7xl md:text-8xl font-bold tabular-nums tracking-tight">
                    {formatSecondsToHMS(timeLeft)}
                  </div>
                  {dailyProgressInfo && (
                    <div className="mt-4">
                      <div className="text-sm opacity-80 tabular-nums">
                        {formatMinutesToHMS(dailyProgressInfo.studiedMinutes)} / {formatMinutesToHMS(dailyProgressInfo.dailyGoalMinutes)}
                      </div>
                      <div className="mt-2 w-48 h-1.5 bg-white/20 rounded-full overflow-hidden mx-auto">
                        <div
                          className="h-full bg-white/90 rounded-full transition-all duration-500"
                          style={{ width: `${dailyProgressInfo.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={resetTimer}
                    className="w-12 h-12 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    onClick={toggleTimer}
                    size="lg"
                    className="w-20 h-20 rounded-2xl text-xl font-semibold shadow-xl transition-all hover:scale-105 active:scale-95 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/30"
                  >
                    {isRunning ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={stopAndSave}
                    disabled={!isRunning}
                    className="w-12 h-12 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                    title="Parar e salvar"
                  >
                    <Square className="h-5 w-5" />
                  </Button>
                </div>

                {/* Quick add time */}
                <div className="flex items-center justify-center gap-2">
                  {[5, 10, 15].map(mins => (
                    <Button
                      key={mins}
                      variant="ghost"
                      size="sm"
                      onClick={() => addTime(mins)}
                      className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-xs px-3 h-8"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {mins}min
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
            </AnimatePresence>
          </Card>

          {/* ─── Goals Row: Daily & Weekly Hours ─── */}
          {(dailyProgressInfo || weeklyProgressInfo) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Meta Diária */}
              {dailyProgressInfo && (
                <Card className="overflow-hidden border-border/40 rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Meta Diária
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-primary">
                        {Math.round(dailyProgressInfo.progressPercent)}%
                      </span>
                    </div>
                    <Progress value={dailyProgressInfo.progressPercent} className="h-2.5 mb-3" />
                    <div className="flex justify-between text-sm text-muted-foreground tabular-nums">
                      <span>{formatMinutesToHMS(dailyProgressInfo.studiedMinutes)}</span>
                      <span>{formatMinutesToHMS(dailyProgressInfo.dailyGoalMinutes)}</span>
                    </div>
                    {dailyProgressInfo.isCompleted && (
                      <p className="mt-3 text-xs text-primary font-medium">
                        🎉 Meta concluída!
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Meta Semanal */}
              {weeklyProgressInfo && (
                <Card className="overflow-hidden border-border/40 rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <Calendar className="h-4 w-4 text-accent" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Meta Semanal
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-accent">
                        {Math.round(weeklyProgressInfo.progressPercent)}%
                      </span>
                    </div>
                    <Progress value={weeklyProgressInfo.progressPercent} className="h-2.5 mb-3" />
                    <div className="flex justify-between text-sm text-muted-foreground tabular-nums">
                      <span>{formatMinutesToHMS(weeklyProgressInfo.studiedMinutes)}</span>
                      <span>{formatMinutesToHMS(weeklyProgressInfo.weeklyGoalMinutes)}</span>
                    </div>
                    {weeklyProgressInfo.isCompleted && (
                      <p className="mt-3 text-xs text-accent font-medium">
                        🏆 Meta semanal concluída!
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ─── Stats Row ─── */}
          <div className="grid gap-4 grid-cols-3">
            {[
              { icon: Target, label: 'Sessões', value: todayCompletedCycles, color: 'primary' as const },
              { 
                icon: Timer, 
                label: 'Tempo', 
                value: formatMinutesToHMS(todayStudiedMinutes + ((isRunning && mode === 'work') ? currentElapsedMinutes : 0)), 
                color: 'accent' as const 
              },
              { 
                icon: TrendingUp, 
                label: 'P/ Meta', 
                value: targetCycles > 0 ? Math.max(0, targetCycles - todayCompletedCycles) : '-', 
                color: 'success' as const 
              },
            ].map((stat) => (
              <Card key={stat.label} className="border-border/40 rounded-2xl hover:border-border/60 transition-all">
                <CardContent className="p-6 text-center">
                  <div className={cn(
                    "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 transition-colors",
                    stat.color === 'primary' && "bg-primary/10",
                    stat.color === 'accent' && "bg-accent/10",
                    stat.color === 'success' && "bg-success/10"
                  )}>
                    <stat.icon className={cn(
                      "h-5 w-5",
                      stat.color === 'primary' && "text-primary",
                      stat.color === 'accent' && "text-accent",
                      stat.color === 'success' && "text-success"
                    )} />
                  </div>
                  <p className={cn(
                    "text-2xl font-bold tabular-nums mb-1",
                    stat.color === 'primary' && "text-primary",
                    stat.color === 'accent' && "text-accent",
                    stat.color === 'success' && "text-success"
                  )}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Motivational Quote - Removed for cleaner design */}
        </div>

        {/* ─── Sidebar ─── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Course/Agenda Tabs */}
          <Tabs defaultValue="curso" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-11 rounded-xl bg-muted/60 p-1">
              <TabsTrigger value="curso" className="gap-2 text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <BookOpen className="h-4 w-4" />
                Curso
              </TabsTrigger>
              <TabsTrigger value="hoje" className="gap-2 text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Calendar className="h-4 w-4" />
                Hoje
              </TabsTrigger>
              <TabsTrigger value="ajustes" className="gap-2 text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Settings className="h-4 w-4" />
                Ajustes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="curso" className="mt-4 space-y-4">
              {/* Planning Selection */}
              <Card className="rounded-xl border-border/40">
                <CardHeader className="pb-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      Planejamento
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {filteredTodayPlans.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 rounded-full px-2.5">
                          Hoje: {filteredTodayPlans.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-5 pt-0">
                  {/* Info message when plans are completed */}
                  {filteredTodayPlans.length === 0 && todayPlans.length === 0 && studyPlans.length > 0 && (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-success">Parabéns! 🎉</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Você completou todas as metas de estudo do dia! Os planejamentos aparecerão novamente amanhã.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Category Filter */}
                  {availableCategories.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant={categoryFilter === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 text-xs px-3 rounded-lg"
                        onClick={() => setCategoryFilter('all')}
                      >
                        Todos
                      </Button>
                      {availableCategories.map(cat => (
                        <Button
                          key={cat}
                          variant={categoryFilter === cat ? 'default' : 'ghost'}
                          size="sm"
                          className="h-8 text-xs px-3 rounded-lg gap-1.5"
                          onClick={() => setCategoryFilter(cat)}
                        >
                          {cat === 'faculdade' && <GraduationCap className="h-3.5 w-3.5" />}
                          {cat === 'faculdade' ? 'Faculdade' : cat === 'pessoal' ? 'Pessoal' : cat === 'profissional' ? 'Profissional' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Button>
                      ))}
                    </div>
                  )}

                  <Select value={selectedPlan} onValueChange={handlePlanChange}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Selecione um planejamento..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px] rounded-xl">
                      {filteredTodayPlans.length > 0 ? (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-primary bg-muted/50">
                            📅 Ativos Hoje
                          </div>
                          {filteredTodayPlans.map(plan => (
                            <SelectItem key={plan.id} value={plan.id}>
                              <div className="flex items-center gap-2 w-full">
                                {plan.planning_category === 'faculdade' ? (
                                  <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                                ) : (
                                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                                )}
                                <span className="truncate flex-1">{plan.name}</span>
                                <Badge variant="outline" className="text-[10px] px-2 py-0 shrink-0 rounded-full">
                                  {plan.study_plan_courses?.length || 0} cursos
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                          <div className="h-px bg-border my-1" />
                        </>
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <div className="flex flex-col items-center gap-3 text-muted-foreground">
                            <CheckCircle2 className="h-10 w-10 text-success" />
                            <p className="text-sm font-medium">Metas do dia concluídas! 🎉</p>
                            <p className="text-xs">Todos os planejamentos de hoje foram completados.</p>
                            <p className="text-xs mt-1">Amanhã eles aparecerão novamente.</p>
                          </div>
                        </div>
                      )}
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                        📚 Todos os Planejamentos
                      </div>
                      {filteredAllPlans.map(plan => {
                        const isInTodayPlans = filteredTodayPlans.some(tp => tp.id === plan.id);
                        return (
                          <SelectItem 
                            key={plan.id} 
                            value={plan.id}
                            className={cn(isInTodayPlans && "opacity-50")}
                          >
                            <div className="flex items-center gap-2 w-full">
                              {plan.planning_category === 'faculdade' ? (
                                <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <span className="truncate flex-1">{plan.name}</span>
                              <Badge variant="outline" className="text-[10px] px-2 py-0 shrink-0 rounded-full">
                                {plan.study_plan_courses?.length || 0}
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Plan Info */}
                  {selectedPlan && (() => {
                    const plan = studyPlans.find(p => p.id === selectedPlan);
                    if (!plan) return null;
                    
                    const totalHours = plan.total_hours || 0;
                    const completedHours = plan.study_plan_courses?.reduce(
                      (sum, pc) => sum + (pc.courses?.completed_hours || 0), 0
                    ) || 0;
                    const progressPercent = totalHours > 0 ? (completedHours / totalHours) * 100 : 0;
                    
                    return (
                      <div className="space-y-4">
                        {/* Plan Progress */}
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-primary">
                              <Target className="h-4 w-4" />
                              <span className="text-xs font-medium">Progresso do Plano</span>
                            </div>
                            <span className="text-lg font-bold text-primary tabular-nums">{Math.round(progressPercent)}%</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                            <span>{completedHours.toFixed(1)}h estudadas</span>
                            <span>{totalHours.toFixed(1)}h total</span>
                          </div>
                        </div>
                        
                        {/* Course List */}
                        {plan.study_plan_courses && plan.study_plan_courses.length > 0 && (() => {
                          const sortedCourses = [...plan.study_plan_courses]
                            .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
                          const currentCourseEntry = sortedCourses.find(pc => pc.courses?.id === currentPlanCourse);
                          const completedCount = sortedCourses.filter(pc => {
                            const c = pc.courses;
                            if (!c) return false;
                            return pc.is_completed || (c.total_hours > 0 && (c.completed_hours || 0) >= c.total_hours);
                          }).length;
                          const pendingCount = sortedCourses.length - completedCount;

                          return (
                            <div className="space-y-3">
                              {/* Current Course */}
                              {currentCourseEntry?.courses && !currentCourseEntry.is_completed && (
                                <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-success/20">
                                      <Zap className="h-4 w-4 text-success" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-muted-foreground">Curso Atual</p>
                                      <p className="text-sm font-semibold truncate">{currentCourseEntry.courses.name}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                                      {currentCourseEntry.courses.completed_hours || 0}h / {currentCourseEntry.courses.total_hours || 0}h
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Toggle */}
                              <button
                                type="button"
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
                                onClick={() => {
                                  const el = document.getElementById('plan-courses-list');
                                  if (el) el.classList.toggle('hidden');
                                  const chevron = document.getElementById('plan-courses-chevron');
                                  if (chevron) chevron.classList.toggle('rotate-180');
                                }}
                              >
                                <span className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4" />
                                  {pendingCount} pendente{pendingCount !== 1 ? 's' : ''} · {completedCount} concluído{completedCount !== 1 ? 's' : ''}
                                </span>
                                <ChevronDown id="plan-courses-chevron" className="h-4 w-4 transition-transform duration-200" />
                              </button>

                              {/* Expandable list */}
                              <div id="plan-courses-list" className="hidden space-y-2">
                                {sortedCourses.map(pc => {
                                  const course = pc.courses;
                                  if (!course) return null;
                                  
                                  const isAutoCompleted = course.total_hours > 0 && (course.completed_hours || 0) >= course.total_hours;
                                  const isMarkedCompleted = pc.is_completed;
                                  const isCompleted = isAutoCompleted || isMarkedCompleted;
                                  const isCurrent = course.id === currentPlanCourse;
                                  
                                  return (
                                    <div
                                      key={course.id}
                                      className={cn(
                                        "p-3 rounded-xl border transition-all flex items-center gap-3",
                                        isCompleted
                                          ? "bg-muted/30 border-muted"
                                          : isCurrent
                                          ? "bg-success/10 border-success/20"
                                          : "bg-card border-border/50 hover:border-primary/20"
                                      )}
                                    >
                                      <Checkbox
                                        checked={isCompleted}
                                        onCheckedChange={async (checked) => {
                                          if (!user) return;
                                          const { data: spcData } = await supabase
                                            .from('study_plan_courses')
                                            .select('id')
                                            .eq('study_plan_id', selectedPlan)
                                            .eq('course_id', course.id)
                                            .maybeSingle();
                                          
                                          if (!spcData) return;
                                          
                                          await supabase
                                            .from('study_plan_courses')
                                            .update({
                                              is_completed: !!checked,
                                              completed_at: checked ? new Date().toISOString() : null,
                                            })
                                            .eq('id', spcData.id);
                                          
                                          fetchStudyPlans();
                                          
                                          if (checked && !isCompleted) {
                                            toast({
                                              title: "✅ Curso concluído!",
                                              description: `${course.name} foi marcado como concluído.`,
                                            });
                                          }
                                        }}
                                        className={cn(
                                          "shrink-0",
                                          isCompleted && "data-[state=checked]:bg-success data-[state=checked]:border-success"
                                        )}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isRunning && course.id !== selectedCourse) {
                                            setPendingCourseId(course.id);
                                            setShowCourseChangeDialog(true);
                                          } else {
                                            setCurrentPlanCourse(course.id);
                                            setSelectedCourse(course.id);
                                          }
                                        }}
                                        className="flex-1 min-w-0 text-left"
                                      >
                                        <p className={cn(
                                          "text-sm font-medium truncate",
                                          isCompleted && "line-through text-muted-foreground"
                                        )}>
                                          {course.name}
                                        </p>
                                      </button>
                                      {isCurrent && !isCompleted && (
                                        <Badge variant="default" className="text-[10px] px-2 py-0.5 shrink-0 rounded-full">
                                          Atual
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* Manual Daily Goal (no plan) */}
                  {selectedCourse && !hasPlanForSelectedCourse && (
                    <div className="space-y-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <Label className="text-sm flex items-center gap-2 text-slate-300">
                        <Target className="h-4 w-4 text-amber-500" />
                        Meta Diária Manual (horas)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={0.25}
                          step={0.25}
                          placeholder="Ex: 2"
                          className="h-10 text-sm rounded-xl bg-slate-900/50 border-slate-700/50 text-white"
                          value={manualDailyHours}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualDailyHours(val);
                            if (selectedCourse) {
                              if (val) {
                                localStorage.setItem(`${MANUAL_DAILY_GOAL_KEY_PREFIX}${selectedCourse}`, val);
                              } else {
                                localStorage.removeItem(`${MANUAL_DAILY_GOAL_KEY_PREFIX}${selectedCourse}`);
                              }
                            }
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs rounded-xl bg-slate-900/50 border-slate-700/50 hover:bg-slate-800 text-slate-300"
                        onClick={() => fetchTodayStudiedTime()}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-2" />
                        Recalcular hoje
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ciclos de Estudo (depende do curso selecionado) */}
              {selectedCourse && courseDailyInfo && (
                <Card className="rounded-2xl">
                  <CardHeader className="pb-2 p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-primary/10">
                        <Target className="h-3.5 w-3.5 text-primary" />
                      </div>
                      Ciclos de Estudo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-0">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => setTargetCycles(Math.max(1, targetCycles - 1))}
                        disabled={targetCycles <= 1}
                      >
                        <span className="text-lg font-bold">−</span>
                      </Button>
                      <div className="flex-1 text-center">
                        <span className="text-3xl font-bold font-display text-primary tabular-nums">{targetCycles}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">ciclos</p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => setTargetCycles(Math.min(12, targetCycles + 1))}
                        disabled={targetCycles >= 12}
                      >
                        <span className="text-lg font-bold">+</span>
                      </Button>
                    </div>

                    {cyclesInfo && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 rounded-xl bg-primary/[0.06] border border-primary/10">
                            <div className="flex items-center gap-1 text-primary mb-1">
                              <Brain className="h-3 w-3" />
                              <span className="text-[10px] font-medium">Foco</span>
                            </div>
                            <p className="text-sm font-bold font-mono tabular-nums">{formatMinutesToHMS(cyclesInfo.workMinutesPerCycle)}</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-accent/[0.06] border border-accent/10">
                            <div className="flex items-center gap-1 text-accent mb-1">
                              <Coffee className="h-3 w-3" />
                              <span className="text-[10px] font-medium">Pausa</span>
                            </div>
                            <p className="text-sm font-bold font-mono tabular-nums">{formatMinutesToHMS(cyclesInfo.breakMinutesPerCycle)}</p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Progresso</span>
                            <span className="font-medium tabular-nums">{sessions}/{targetCycles}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(100, (sessions / targetCycles) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ─── Aba HOJE: agenda + metas + histórico ─── */}
            <TabsContent value="hoje" className="mt-3 space-y-3">
              <DailyAgenda onStartSession={handleStartFromAgenda} refreshKey={focusRefreshKey} />
              <div className="hidden sm:block">
                <FocusGoalsPanel />
              </div>
              <div className="hidden sm:block">
                <TodaySessionsHistory />
              </div>
            </TabsContent>

            {/* ─── Aba AJUSTES: configurações + presets ─── */}
            <TabsContent value="ajustes" className="mt-3 space-y-3">
              <Card className="rounded-2xl">
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-muted">
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    Configurações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Pausa automática</Label>
                    <Switch
                      checked={settings.autoStartBreak}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, autoStartBreak: Boolean(checked) }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Ciclos até pausa longa</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-xl"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            cyclesUntilLongBreak: Math.max(2, (prev.cyclesUntilLongBreak ?? 4) - 1),
                          }))
                        }
                        disabled={(settings.cyclesUntilLongBreak ?? 4) <= 2}
                      >
                        <span className="font-bold">−</span>
                      </Button>
                      <div className="flex-1 text-center">
                        <span className="text-xl font-bold font-display text-primary tabular-nums">
                          {settings.cyclesUntilLongBreak}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-xl"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            cyclesUntilLongBreak: Math.min(12, (prev.cyclesUntilLongBreak ?? 4) + 1),
                          }))
                        }
                        disabled={(settings.cyclesUntilLongBreak ?? 4) >= 12}
                      >
                        <span className="font-bold">+</span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex gap-2">
                      <Button
                        variant={mode === 'work' ? 'default' : 'outline'}
                        className="flex-1 h-9 text-xs rounded-xl"
                        onClick={() => changeMode('work')}
                      >
                        <Brain className="h-3.5 w-3.5 mr-1" />
                        Foco
                      </Button>
                      <Button
                        variant={mode === 'break' ? 'default' : 'outline'}
                        className="flex-1 h-9 text-xs rounded-xl"
                        onClick={() => changeMode('break')}
                      >
                        <Coffee className="h-3.5 w-3.5 mr-1" />
                        Pausa
                      </Button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Select value={selectedSound} onValueChange={(v) => setSelectedSound(v as 'bell' | 'chime' | 'digital' | 'gentle')}>
                        <SelectTrigger className="flex-1 h-9 text-xs rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {soundOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => playSound()}
                        title="Testar som"
                        className="h-9 w-9 rounded-xl"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-primary/10">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Presets Rápidos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 px-4 pb-4">
                  {presets.slice(0, 3).map(p => (
                    <button
                      key={p.name}
                      onClick={() => changePreset(p)}
                      className={cn(
                        "w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 group",
                        preset.name === p.name
                          ? "border-primary/30 bg-primary/[0.06] shadow-sm"
                          : "border-border/50 hover:border-primary/20 hover:bg-muted/30"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-xs truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                          {p.work}m foco · {p.break}m pausa · {p.longBreak}m longa
                        </p>
                      </div>
                      {preset.name === p.name && (
                        <Badge variant="default" className="text-[9px] shrink-0 rounded-full px-2">Ativo</Badge>
                      )}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>

      <TimerSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        presets={presets}
        updatePreset={updatePreset}
        addCustomPreset={addCustomPreset}
        removePreset={removePreset}
      />

      {/* Course Change Dialog */}
      <AlertDialog open={showCourseChangeDialog} onOpenChange={setShowCourseChangeDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Timer em execução</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem uma sessão de foco em andamento. O que deseja fazer antes de trocar de curso?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => {
              setPendingCourseId(null);
              setShowCourseChangeDialog(false);
            }}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDiscardAndChangeCourse}
            >
              Descartar progresso
            </Button>
            <AlertDialogAction onClick={handleSaveAndChangeCourse}>
              Salvar e trocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
