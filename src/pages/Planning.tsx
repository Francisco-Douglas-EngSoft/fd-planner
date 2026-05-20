import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, BookOpen, MoreVertical, Edit, Trash2, LayoutGrid, CalendarDays, CalendarCheck, GraduationCap, Filter, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { PlanningFormDialog } from '@/components/planning/PlanningFormDialog';
import { PlanDetailsDialog } from '@/components/planning/PlanDetailsDialog';
import { AutoGeneratePlansButton } from '@/components/planning/AutoGeneratePlansButton';
import { TodayStudyCard } from '@/components/planning/TodayStudyCard';
import { WeeklyCalendarSimplified, CourseSchedule } from '@/components/planning/WeeklyCalendarSimplified';
import { StudyTimeBlock } from '@/components/planning/WeeklyCalendar';
import { MonthlyCalendar } from '@/components/planning/MonthlyCalendar';
import { TimeBlockDialog } from '@/components/planning/TimeBlockDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, isWithinInterval, isValid, parseISO, startOfWeek, addDays, subWeeks, addWeeks, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const daysOfWeekFull = [
  { id: 'sunday', label: 'Domingo', abbrev: 'Dom' },
  { id: 'monday', label: 'Segunda', abbrev: 'Seg' },
  { id: 'tuesday', label: 'Terça', abbrev: 'Ter' },
  { id: 'wednesday', label: 'Quarta', abbrev: 'Qua' },
  { id: 'thursday', label: 'Quinta', abbrev: 'Qui' },
  { id: 'friday', label: 'Sexta', abbrev: 'Sex' },
  { id: 'saturday', label: 'Sábado', abbrev: 'Sáb' },
];

const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const MIN_STUDY_MINUTES_PER_DAY = 30;

// Feriados brasileiros fixos e móveis (calculados para o ano)
const getBrazilianHolidays = (year: number): Record<string, string> => {
  const holidays: Record<string, string> = {};
  
  // Feriados fixos
  holidays[`${year}-01-01`] = 'Ano Novo';
  holidays[`${year}-04-21`] = 'Tiradentes';
  holidays[`${year}-05-01`] = 'Dia do Trabalho';
  holidays[`${year}-09-07`] = 'Independência';
  holidays[`${year}-10-12`] = 'N. Sra. Aparecida';
  holidays[`${year}-11-02`] = 'Finados';
  holidays[`${year}-11-15`] = 'Proclamação da República';
  holidays[`${year}-12-25`] = 'Natal';
  
  // Cálculo da Páscoa (algoritmo de Gauss)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  const easter = new Date(year, month - 1, day);
  
  // Feriados móveis baseados na Páscoa
  const carnaval = new Date(easter);
  carnaval.setDate(easter.getDate() - 47);
  holidays[carnaval.toISOString().split('T')[0]] = 'Carnaval';
  
  const carnaval2 = new Date(easter);
  carnaval2.setDate(easter.getDate() - 48);
  holidays[carnaval2.toISOString().split('T')[0]] = 'Carnaval';
  
  const sextaSanta = new Date(easter);
  sextaSanta.setDate(easter.getDate() - 2);
  holidays[sextaSanta.toISOString().split('T')[0]] = 'Sexta-feira Santa';
  
  holidays[easter.toISOString().split('T')[0]] = 'Páscoa';
  
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays[corpusChristi.toISOString().split('T')[0]] = 'Corpus Christi';
  
  return holidays;
};

const formatHoursHMS = (hours: number): string => {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatMinutesToHM = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const safeParseISO = (value: string | null | undefined) => {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
};

const safeFormatISO = (value: string | null | undefined, fmt: string) => {
  const d = safeParseISO(value);
  if (!d) return '—';
  return format(d, fmt, { locale: ptBR });
};

interface StudyPlanCourse {
  id: string;
  course_id: string;
  allocated_hours: number | null;
  is_fixed: boolean | null;
  study_days: string[] | null;
  sequence_order: number | null;
  is_completed: boolean | null;
  courses: {
    name: string;
    total_hours: number | null;
    completed_hours: number | null;
  };
}

interface StudyPlan {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  daily_hours: number | null;
  min_daily_hours?: number | null;
  max_daily_hours?: number | null;
  study_days: string[] | null;
  total_hours: number | null;
  created_at: string;
  effective_start_date?: string | null;
  study_plan_courses?: StudyPlanCourse[];
  planning_category?: string;
  semester?: string | null;
  academic_period_start?: string | null;
  academic_period_end?: string | null;
  hours_per_discipline?: number | null;
  color?: string | null;
}

function SortablePlanCard({ id, children }: { id: string; children: (handleProps: { listeners: any; attributes: any; isDragging: boolean }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners, attributes, isDragging })}
    </div>
  );
}

export default function Planning() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [editPlan, setEditPlan] = useState<StudyPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [timeBlocks, setTimeBlocks] = useState<StudyTimeBlock[]>([]);
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [timeDialogDay, setTimeDialogDay] = useState<string | undefined>(undefined);
  const [planFilter, setPlanFilter] = useState<'all' | 'regular' | 'faculdade'>('all');
  const [formInitialCategory, setFormInitialCategory] = useState<'regular' | 'faculdade' | undefined>(undefined);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Keep time blocks in sync with loaded plans
    fetchTimeBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, plans]);

  const fetchPlans = async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('study_plans')
      .select(`
        *,
        study_plan_courses (
          id,
          course_id,
          allocated_hours,
          is_fixed,
          study_days,
          sequence_order,
          is_completed,
          courses (name, total_hours, completed_hours)
        )
      `)
      .eq('user_id', user.id)
      .order('start_date', { ascending: true });

    if (error) {
      toast({
        title: 'Erro ao carregar planejamentos',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setPlans(data || []);
    }
    setIsLoading(false);
  };

  const fetchTimeBlocks = async () => {
    if (!user) return;
    const planIds = plans.map((p) => p.id);
    if (planIds.length === 0) {
      setTimeBlocks([]);
      return;
    }

    const { data, error } = await supabase
      .from('study_plan_time_blocks')
      .select('*')
      .in('study_plan_id', planIds);

    if (error) {
      // silent-ish; calendar still works without blocks
      console.warn('Failed to fetch time blocks', error);
      return;
    }
    setTimeBlocks((data || []) as unknown as StudyTimeBlock[]);
  };

  const deletePlan = async (planId: string) => {
    const { error } = await supabase
      .from('study_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setPlans(prev => prev.filter(p => p.id !== planId));
      toast({
        title: 'Planejamento excluído',
        description: 'O planejamento foi removido com sucesso.',
      });
    }
  };

  const handleEdit = (plan: StudyPlan, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditPlan(plan);
    setShowFormDialog(true);
  };

  const handlePlanClick = (plan: StudyPlan) => {
    setSelectedPlan(plan);
    setShowDetailsDialog(true);
  };

  const calculateProgress = (plan: StudyPlan) => {
    const today = new Date();
    const start = safeParseISO(plan.start_date);
    const end = safeParseISO(plan.end_date);

    if (!start || !end) return 0;
    if (today < start) return 0;
    if (today > end) return 100;

    const totalDays = differenceInDays(end, start);
    if (totalDays <= 0) return 0;

    const elapsedDays = differenceInDays(today, start);

    return Math.round((elapsedDays / totalDays) * 100);
  };

  // Calculate estimated completion date for a plan
  const calculateEstimatedCompletion = (plan: StudyPlan): Date | null => {
    if (!plan.start_date || !plan.study_days || plan.study_days.length === 0) return null;
    
    const totalHours = plan.total_hours || 0;
    const dailyHours = plan.daily_hours || 1.5;
    
    if (totalHours <= 0 || dailyHours <= 0) return null;
    
    // Calculate how many study days are needed
    const studyDaysNeeded = Math.ceil(totalHours / dailyHours);
    
    // Map day names to day numbers (0 = Sunday)
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    
    const selectedDayNumbers = new Set(plan.study_days.map(d => dayMap[d]));
    
    const start = safeParseISO(plan.start_date);
    if (!start) return null;
    
    let currentDate = start;
    let studyDaysCount = 0;
    
    while (studyDaysCount < studyDaysNeeded) {
      if (selectedDayNumbers.has(currentDate.getDay())) {
        studyDaysCount++;
        if (studyDaysCount === studyDaysNeeded) {
          return currentDate;
        }
      }
      currentDate = addDays(currentDate, 1);
      
      // Safety limit (max 5 years)
      if (differenceInDays(currentDate, start) > 1825) {
        return null;
      }
    }
    
    return currentDate;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const formatDateKey = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const getPlansForDate = (dateKey: string) => {
    const date = safeParseISO(dateKey);
    if (!date) return [];

    return plans.filter(plan => {
      const start = safeParseISO(plan.start_date);
      const end = safeParseISO(plan.end_date);
      if (!start || !end) return false;

      return isWithinInterval(date, { start, end });
    });
  };

  const goToPreviousMonthCalendar = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonthCalendar = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const today = new Date();
  const isToday = (day: number) => {
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const weeklySchedule = useMemo(() => {
    const schedule: Record<string, CourseSchedule[]> = {};
    
    const colors = [
      'bg-primary',
      'bg-accent',
      'bg-success',
      'bg-warning',
      'bg-destructive/80',
      'bg-violet-500',
    ];

    daysOfWeekFull.forEach(day => {
      schedule[day.id] = [];
    });

    // Filter plans that overlap with the current week
    const activePlans = plans.filter(plan => {
      const start = safeParseISO(plan.start_date);
      const end = safeParseISO(plan.end_date);
      if (!start || !end) return false;

      const weekEnd = weekDates[6];
      return !(end < weekDates[0] || start > weekEnd);
    });

    activePlans.forEach((plan) => {
      if (!plan.study_plan_courses || plan.study_plan_courses.length === 0) return;
      if (!plan.study_days || plan.study_days.length === 0) return;

      const planStart = safeParseISO(plan.start_date);
      const planEnd = safeParseISO(plan.end_date);
      if (!planStart || !planEnd) return;

      const dailyHours = plan.daily_hours || 1.5;
      const totalDailyMinutes = dailyHours * 60;

      const sortedCourses = [...plan.study_plan_courses].sort((a, b) => 
        (a.sequence_order || 0) - (b.sequence_order || 0)
      );

      // Find the current sequence order (first non-completed course's sequence)
      const currentSequenceCourse = sortedCourses.find(pc => !pc.is_completed && !pc.is_fixed);
      const currentSequenceOrder = currentSequenceCourse?.sequence_order || 1;

      const fixedCourses = sortedCourses.filter(pc => pc.is_fixed);
      // Get all courses with the SAME sequence_order as the current one (they run in parallel)
      const parallelCourses = sortedCourses.filter(pc => 
        !pc.is_fixed && (pc.sequence_order || 1) === currentSequenceOrder
      );

      const activeCourses = [
        ...fixedCourses,
        ...parallelCourses
      ];

      // Calculate total hours for parallel courses only (same sequence)
      const totalParallelHours = parallelCourses.reduce(
        (sum, pc) => sum + (pc.courses?.total_hours || 0), 0
      );
      
      // Calculate total hours for fixed courses
      const totalFixedHours = fixedCourses.reduce(
        (sum, pc) => sum + (pc.courses?.total_hours || 0), 0
      );

      if (totalParallelHours === 0 && totalFixedHours === 0) return;

      activeCourses.forEach((pc, idx) => {
        const courseHours = pc.courses?.total_hours || 0;
        
        // For fixed courses, distribute proportionally with other fixed courses
        // For parallel courses, distribute proportionally with other parallel courses
        let dailyMinutes: number;
        if (pc.is_fixed) {
          // Fixed courses share time proportionally among themselves
          const fixedProportion = totalFixedHours > 0 ? courseHours / totalFixedHours : 0;
          // Fixed courses get half of daily time if there are parallel courses too
          const fixedDailyMinutes = parallelCourses.length > 0 ? totalDailyMinutes * 0.5 : totalDailyMinutes;
          dailyMinutes = fixedDailyMinutes * fixedProportion;
        } else {
          // Parallel courses share remaining time proportionally
          const parallelProportion = totalParallelHours > 0 ? courseHours / totalParallelHours : 0;
          const parallelDailyMinutes = fixedCourses.length > 0 ? totalDailyMinutes * 0.5 : totalDailyMinutes;
          dailyMinutes = parallelDailyMinutes * parallelProportion;
        }
        
        const courseStudyDays = pc.is_fixed 
          ? plan.study_days 
          : (pc.study_days && pc.study_days.length > 0 ? pc.study_days : plan.study_days);
        
        const isCurrentInSequence = !pc.is_fixed && (pc.sequence_order || 1) === currentSequenceOrder;
        
        let assignedDays = courseStudyDays || plan.study_days || [];
        assignedDays = assignedDays.filter(d => plan.study_days!.includes(d));
        if (assignedDays.length === 0) {
          assignedDays = [...plan.study_days!];
        }

        // For each day of the week, check if that specific date is within the plan period
        assignedDays.forEach(dayId => {
          if (schedule[dayId]) {
            // Find the actual date for this day in the current week
            const dayIndex = daysOfWeekFull.findIndex(d => d.id === dayId);
            if (dayIndex === -1) return;
            
            const dayDate = weekDates[dayIndex];
            
            // Only add course if this specific date is within the plan period
            if (dayDate >= planStart && dayDate <= planEnd) {
              schedule[dayId].push({
                courseName: pc.courses?.name || '',
                dailyMinutes,
                color: colors[(pc.sequence_order || idx) % colors.length],
                isFixed: pc.is_fixed || false,
                sequenceOrder: pc.sequence_order || idx + 1,
                isCurrentInSequence,
                courseId: pc.course_id,
                completedHours: pc.courses?.completed_hours || 0,
                totalHours: pc.courses?.total_hours || 0,
              });
            }
          }
        });
      });
    });

    // Sort courses within each day by sequence order
    Object.keys(schedule).forEach(dayId => {
      schedule[dayId].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    });

    return schedule;
  }, [plans, weekDates]);

  const handleCourseDrop = async (courseId: string, fromDay: string, toDay: string) => {
    // Find the study_plan_course that matches this courseId
    for (const plan of plans) {
      const planCourse = plan.study_plan_courses?.find(pc => pc.course_id === courseId);
      if (planCourse) {
        const currentDays = planCourse.study_days || plan.study_days || [];
        
        // Remove from old day and add to new day
        const newDays = currentDays.filter(d => d !== fromDay);
        if (!newDays.includes(toDay)) {
          newDays.push(toDay);
        }
        
        const { error } = await supabase
          .from('study_plan_courses')
          .update({ study_days: newDays })
          .eq('id', planCourse.id);
        
        if (error) {
          toast({
            title: 'Erro ao reorganizar',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Curso reorganizado',
            description: `Movido para ${daysOfWeekFull.find(d => d.id === toDay)?.label || toDay}`,
          });
          fetchPlans();
        }
        break;
      }
    }
  };

  const planOptions = useMemo(() => {
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      courses: (p.study_plan_courses || []).map((pc) => ({
        id: pc.course_id,
        name: pc.courses?.name || 'Curso',
      })),
    }));
  }, [plans]);

  // Ordem manual persistida em localStorage por usuário + filtro
  const orderStorageKey = useMemo(
    () => (user ? `planning:order:${user.id}:${planFilter}` : null),
    [user, planFilter]
  );

  const [manualOrder, setManualOrder] = useState<string[]>([]);

  useEffect(() => {
    if (!orderStorageKey) return;
    try {
      const raw = localStorage.getItem(orderStorageKey);
      setManualOrder(raw ? JSON.parse(raw) : []);
    } catch {
      setManualOrder([]);
    }
  }, [orderStorageKey]);

  const filteredPlans = useMemo(() => {
    const base = planFilter === 'all'
      ? plans
      : plans.filter(p => (p.planning_category || 'regular') === planFilter);
    if (manualOrder.length === 0) return base;
    const indexMap = new Map(manualOrder.map((id, i) => [id, i]));
    return [...base].sort((a, b) => {
      const ai = indexMap.has(a.id) ? indexMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const bi = indexMap.has(b.id) ? indexMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  }, [plans, planFilter, manualOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !orderStorageKey) return;
    const ids = filteredPlans.map(p => p.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ids, oldIndex, newIndex);
    setManualOrder(next);
    try {
      localStorage.setItem(orderStorageKey, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }, [filteredPlans, orderStorageKey]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="space-y-6 sm:space-y-8"
    >
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/15 via-card to-accent/10 border border-primary/10 p-5 sm:p-8">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/15 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex flex-col gap-4 sm:gap-6">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/30 shrink-0">
                <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold font-display bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent truncate">
                  Planejamentos
                </h1>
                <p className="text-muted-foreground text-xs sm:text-base mt-0.5 hidden sm:block">
                  Organize seus estudos e alcance seus objetivos
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                className="gap-2 rounded-xl px-3 sm:px-5 h-9 sm:h-11 border-primary/30 hover:bg-primary/10"
                onClick={() => {
                  setTimeDialogDay(undefined);
                  setTimeDialogOpen(true);
                }}
                title="Definir os horários em que você irá estudar este planejamento"
              >
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline font-semibold">Horários de Estudo</span>
                <span className="sm:hidden font-semibold text-xs">Horários</span>
              </Button>

              <Button
                className="gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-105 rounded-xl px-3 sm:px-6 h-9 sm:h-11"
                onClick={() => {
                  setEditPlan(null);
                  setFormInitialCategory(planFilter === 'faculdade' ? 'faculdade' : planFilter === 'regular' ? 'regular' : undefined);
                  setShowFormDialog(true);
                }}
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline font-semibold">Novo Planejamento</span>
                <span className="sm:hidden font-semibold text-xs">Novo</span>
              </Button>
            </div>
          </div>
          
          {/* View Mode Toggle & Auto Generate - separate row on mobile */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {plans.length > 0 && (
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'weekly' | 'monthly')} className="flex-1 sm:flex-none min-w-0">
                <TabsList className="w-full sm:w-auto bg-background/80 backdrop-blur-sm border border-border/50 rounded-xl p-1">
                  <TabsTrigger value="weekly" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all">
                    <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Semanal</span>
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all">
                    <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Mensal</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <AutoGeneratePlansButton onSuccess={fetchPlans} />
          </div>
        </div>
        
        {/* Stats Summary */}
        {plans.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } },
            }}
            className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6"
          >
            {[
              { icon: BookOpen, label: 'Total Planos', value: plans.length, color: 'foreground' },
              { icon: Clock, label: 'Horas Total', value: `${Math.round(plans.reduce((sum, p) => sum + (p.total_hours || 0), 0))}h`, color: 'primary' },
              { icon: CalendarIcon, label: 'Cursos Totais', value: plans.reduce((sum, p) => sum + (p.study_plan_courses?.length || 0), 0), color: 'accent' },
              { icon: CalendarCheck, label: 'Ativos Hoje', value: plans.filter(p => { const start = safeParseISO(p.start_date); const end = safeParseISO(p.end_date); return start && end && today >= start && today <= end; }).length, color: 'success' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={{
                  hidden: { opacity: 0, y: 16, scale: 0.96 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="bg-background/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-border/30 hover:border-border/60 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <stat.icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{stat.label}</span>
                </div>
                <p className={cn(
                  "text-xl sm:text-2xl font-bold",
                  stat.color === 'primary' && "text-primary",
                  stat.color === 'accent' && "text-accent",
                  stat.color === 'success' && "text-success",
                  stat.color === 'foreground' && "text-foreground",
                )}>
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Today's Study Card */}
      <TodayStudyCard plans={plans} />

      {/* Calendar Component - Weekly or Monthly */}
      {plans.length > 0 && viewMode === 'weekly' && (
        <WeeklyCalendarSimplified
          weeklySchedule={weeklySchedule}
          currentWeekStart={currentWeekStart}
          onPreviousWeek={goToPreviousWeek}
          onNextWeek={goToNextWeek}
          onGoToCurrentWeek={goToCurrentWeek}
        />
      )}

      {plans.length > 0 && viewMode === 'monthly' && (
        <MonthlyCalendar
          weeklySchedule={weeklySchedule}
          currentMonth={currentMonth}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onGoToCurrentMonth={goToCurrentMonth}
        />
      )}

      {/* Calendar Section - Full Width with Info Panel */}
      <div className="grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Full Calendar - Left Side */}
        <Card className="border border-border/30 shadow-xl overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-primary/3">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/30 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent">
            <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                <CalendarIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold">Calendário</span>
            </CardTitle>
            <div className="flex items-center gap-1.5 bg-muted/50 backdrop-blur-sm rounded-xl p-1.5 border border-border/30">
              <Button variant="ghost" size="icon" onClick={goToPreviousMonthCalendar} className="rounded-lg h-8 w-8 hover:bg-background/80">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-bold text-sm min-w-[130px] text-center capitalize">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button variant="ghost" size="icon" onClick={goToNextMonthCalendar} className="rounded-lg h-8 w-8 hover:bg-background/80">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {daysOfWeek.map((day, idx) => (
                <div 
                  key={day} 
                  className={cn(
                    "text-center text-xs sm:text-sm font-bold py-2.5 rounded-xl transition-colors",
                    idx === 0 || idx === 6 
                      ? "text-destructive/70 bg-destructive/5" 
                      : "text-muted-foreground bg-muted/30"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth(currentDate).map((day, index) => {
                if (!day) return <div key={index} className="aspect-square" />;
                
                const dateKey = formatDateKey(day);
                const datePlans = getPlansForDate(dateKey);
                const isSelected = selectedDate === dateKey;
                const holidays = getBrazilianHolidays(currentDate.getFullYear());
                const holiday = holidays[dateKey];
                const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const dayOfWeek = dateObj.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    title={holiday || undefined}
                    className={cn(
                      "aspect-square rounded-xl transition-all relative flex flex-col items-center justify-center text-sm font-medium group/day",
                      "hover:bg-primary/15 hover:text-primary hover:scale-105 hover:shadow-lg",
                      isToday(day) && "ring-2 ring-primary ring-offset-2 ring-offset-background font-bold text-primary bg-primary/10",
                      isSelected && "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary/80 shadow-xl scale-105",
                      datePlans.length > 0 && !isSelected && "bg-primary/15 text-primary font-bold",
                      holiday && !isSelected && "bg-destructive/10 text-destructive",
                      isWeekend && !isSelected && !holiday && !datePlans.length && "text-muted-foreground/50"
                    )}
                  >
                    <span className="text-sm sm:text-base">{day}</span>
                    <div className="flex gap-1 mt-0.5">
                      {holiday && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive shadow-sm" />
                      )}
                      {datePlans.length > 0 && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-sm" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day Info Panel - Right Side */}
        <Card className="border border-border/30 shadow-xl overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-accent/3">
          <CardHeader className="pb-4 border-b border-border/30 bg-gradient-to-r from-accent/8 via-accent/5 to-transparent">
            <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent to-accent/80 shadow-lg shadow-accent/25">
                <Clock className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="font-bold">Informações</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-5">
            {/* Current Week Info */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border border-primary/20">
              <h4 className="font-bold text-sm text-primary mb-2 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Semana Atual
              </h4>
              <p className="text-sm font-medium text-foreground">
                {format(startOfWeek(new Date(), { weekStartsOn: 0 }), "dd 'de' MMMM", { locale: ptBR })} — {format(addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), 6), "dd 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Semana {format(new Date(), 'w')} do ano
              </p>
            </div>

            {/* Selected Date Info */}
            {selectedDate ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-muted/70 to-muted/30 border border-border/50">
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    Data Selecionada
                  </h4>
                  <p className="text-base sm:text-lg font-bold text-foreground capitalize">
                    {format(parseISO(selectedDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  {(() => {
                    const dateObj = parseISO(selectedDate);
                    const dayOfWeek = dateObj.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    if (isWeekend) {
                      return (
                        <Badge variant="outline" className="mt-2.5 bg-muted/50 text-muted-foreground rounded-lg">
                          Final de semana
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                </div>

                {(() => {
                  const holidays = getBrazilianHolidays(currentDate.getFullYear());
                  const holiday = holidays[selectedDate];
                  const datePlans = getPlansForDate(selectedDate);
                  
                  return (
                    <>
                      {holiday && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-destructive/15 to-destructive/5 border border-destructive/20">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-destructive/20 text-xl">
                              🎉
                            </div>
                            <div>
                              <h5 className="font-bold text-destructive">Feriado Nacional</h5>
                              <p className="text-sm font-medium text-foreground mt-0.5">{holiday}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {datePlans.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-bold text-sm flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            Planejamentos do dia ({datePlans.length})
                          </h4>
                          {datePlans.map(plan => (
                            <div
                              key={plan.id}
                              className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/12 via-primary/8 to-transparent cursor-pointer hover:from-primary/20 hover:via-primary/12 transition-all border border-primary/15 group/plan"
                              onClick={() => handlePlanClick(plan)}
                            >
                              <div className="w-1.5 h-12 rounded-full bg-gradient-to-b from-primary to-primary/60 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold truncate group-hover/plan:text-primary transition-colors">{plan.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {plan.study_plan_courses?.length || 0} curso(s) • {formatHoursHMS(plan.daily_hours || 1.5)}/dia
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover/plan:text-primary group-hover/plan:translate-x-0.5 transition-all" />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {!holiday && datePlans.length === 0 && (
                        <div className="p-8 text-center rounded-xl bg-muted/20 border border-dashed border-border/50">
                          <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                          <p className="text-muted-foreground text-sm font-medium">
                            Nenhum evento nesta data
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-muted/20 border border-dashed border-border/50">
                <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm font-medium">
                  Selecione uma data no calendário
                </p>
              </div>
            )}

            {/* Holidays Legend */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/30">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                <span className="text-lg">📅</span>
                Legenda
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-sm" />
                  <span className="text-muted-foreground font-medium">Planejamento ativo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-destructive to-destructive/70 shadow-sm" />
                  <span className="text-muted-foreground font-medium">Feriado nacional</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full ring-2 ring-primary ring-offset-1 ring-offset-background" />
                  <span className="text-muted-foreground font-medium">Hoje</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-muted" />
                  <span className="text-muted-foreground font-medium">Final de semana</span>
                </div>
              </div>
            </div>

            {/* Upcoming Holidays */}
            {(() => {
              const holidays = getBrazilianHolidays(currentDate.getFullYear());
              const todayDate = new Date();
              const upcomingHolidays = Object.entries(holidays)
                .filter(([date]) => parseISO(date) > todayDate)
                .sort(([a], [b]) => parseISO(a).getTime() - parseISO(b).getTime())
                .slice(0, 3);

              if (upcomingHolidays.length === 0) return null;

              return (
                <div className="p-4 rounded-xl bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border border-warning/15">
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-warning">
                    <span className="text-lg">🎊</span>
                    Próximos Feriados
                  </h4>
                  <div className="space-y-2.5">
                    {upcomingHolidays.map(([date, name]) => (
                      <div key={date} className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium">{name}</span>
                        <span className="text-muted-foreground text-xs font-mono bg-muted/50 px-2 py-0.5 rounded-lg">
                          {format(parseISO(date), "dd/MM", { locale: ptBR })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Plans Section */}
      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-3 text-lg sm:text-xl">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/25 shrink-0">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Meus Planejamentos</span>
            </h3>
            <Badge variant="secondary" className="text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-1.5 font-bold rounded-xl bg-primary/10 text-primary border-0 shrink-0">
              {filteredPlans.length} plano{filteredPlans.length === 1 ? '' : 's'}
            </Badge>
          </div>
          <div className="overflow-x-auto -mx-1 px-1">
            <Tabs value={planFilter} onValueChange={(v) => setPlanFilter(v as 'all' | 'regular' | 'faculdade')} className="w-full sm:w-auto">
              <TabsList className="w-full sm:w-auto bg-background/80 backdrop-blur-sm border border-border/50 rounded-xl p-1">
                <TabsTrigger value="all" className="flex-1 sm:flex-none text-xs sm:text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  Todos
                </TabsTrigger>
                <TabsTrigger value="regular" className="flex-1 sm:flex-none text-xs sm:text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  Cursos
                </TabsTrigger>
                <TabsTrigger value="faculdade" className="flex-1 sm:flex-none text-xs sm:text-sm rounded-lg data-[state=active]:bg-warning data-[state=active]:text-warning-foreground transition-all gap-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Faculdades
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="relative">
              <div className="animate-spin rounded-full h-14 w-14 border-4 border-primary/20 border-t-primary"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary animate-pulse" />
              </div>
            </div>
          </div>
        ) : (
          filteredPlans.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 bg-gradient-to-br from-card via-card to-primary/5 rounded-2xl">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 mx-auto mb-5 flex items-center justify-center shadow-2xl shadow-primary/30">
              <BookOpen className="h-10 w-10 text-primary-foreground" />
            </div>
            <h4 className="font-bold text-xl mb-2">
              {planFilter === 'all' && 'Nenhum planejamento criado'}
              {planFilter === 'faculdade' && 'Nenhum planejamento de faculdade'}
              {planFilter === 'regular' && 'Nenhum planejamento de cursos'}
            </h4>
            <p className="text-muted-foreground text-sm mb-8 max-w-md mx-auto">
              Organize seus estudos de forma inteligente criando seu primeiro planejamento personalizado
            </p>
            <Button 
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-xl shadow-primary/25 rounded-xl px-8 h-12 text-base font-semibold"
              onClick={() => {
                setEditPlan(null);
                setFormInitialCategory(planFilter === 'faculdade' ? 'faculdade' : planFilter === 'regular' ? 'regular' : undefined);
                setShowFormDialog(true);
              }}
            >
              <Plus className="h-5 w-5 mr-2" />
              {planFilter === 'faculdade' ? 'Criar planejamento de faculdade' : planFilter === 'regular' ? 'Criar planejamento de cursos' : 'Criar primeiro planejamento'}
            </Button>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredPlans.map(p => p.id)} strategy={rectSortingStrategy}>
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } },
            }}
            className="grid gap-5 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
          >
            {filteredPlans.map((plan) => {
              const progress = calculateProgress(plan);
              const isActive = (() => {
                const start = safeParseISO(plan.start_date);
                const end = safeParseISO(plan.end_date);
                return start && end && today >= start && today <= end;
              })();
              
              return (
                <SortablePlanCard key={plan.id} id={plan.id}>
                  {({ listeners, attributes, isDragging }) => (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.97 },
                    visible: { opacity: 1, y: 0, scale: 1 },
                  }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={isDragging ? undefined : { y: -3, transition: { duration: 0.2 } }}
                >
                {(() => {
                  const customColor = plan.color && /^#([0-9a-f]{6})$/i.test(plan.color) ? plan.color : null;
                  const customStyle: React.CSSProperties | undefined = customColor
                    ? {
                        borderColor: `${customColor}66`,
                        backgroundImage: `linear-gradient(135deg, ${customColor}1a 0%, transparent 55%, ${customColor}10 100%)`,
                        boxShadow: `0 10px 30px -12px ${customColor}55`,
                      }
                    : undefined;
                  return (
                <Card 
                  className={cn(
                    "hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden rounded-2xl h-fit",
                    customColor
                      ? "border-2 bg-card"
                      : isActive 
                        ? "border-2 border-primary/30 shadow-xl shadow-primary/10 bg-gradient-to-br from-card via-card to-primary/5" 
                        : "border border-border/50 shadow-lg hover:border-primary/20 bg-card"
                  )}
                  style={customStyle}
                  onClick={() => handlePlanClick(plan)}
                >
                  {/* Status Bar */}
                  {(() => {
                    const isFaculdade = (plan.planning_category || 'regular') === 'faculdade';
                    if (customColor) {
                      return (
                        <div
                          className="h-1.5"
                          style={{ background: `linear-gradient(90deg, ${customColor}, ${customColor}cc, ${customColor})` }}
                        />
                      );
                    }
                    let className = "h-1.5 ";
                    if (isFaculdade) {
                      className += "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500";
                    } else if (isActive) {
                      className += "bg-gradient-to-r from-primary via-primary to-accent";
                    } else {
                      className += "bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/20";
                    }
                    return <div className={className} />;
                  })()}
                  
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        {...listeners}
                        {...attributes}
                        onClick={(e) => e.stopPropagation()}
                        className="touch-none cursor-grab active:cursor-grabbing -ml-1 mt-0.5 p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Arrastar para reordenar"
                        title="Arrastar para reordenar"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!customColor && isActive && (
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" title="Plano ativo" />
                          )}
                          <h4
                            className="font-bold text-base sm:text-lg truncate group-hover:text-primary transition-colors"
                            style={customColor ? { color: customColor } : undefined}
                          >
                            {plan.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          <span className="font-medium">
                            {safeFormatISO(plan.start_date, "dd MMM yyyy")} — {safeFormatISO(plan.end_date, "dd MMM yyyy")}
                          </span>
                          {(plan.planning_category || 'regular') === 'faculdade' && (
                            <Badge className="bg-warning/20 text-warning border-0 text-[10px] px-1.5 py-0">
                              🎓 {plan.semester || 'Faculdade'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => e.stopPropagation()} 
                            className="opacity-0 group-hover:opacity-100 transition-all h-8 w-8 p-0 rounded-lg hover:bg-muted"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-sm z-50 rounded-xl border-border/50">
                          <DropdownMenuItem onClick={(e) => handleEdit(plan, e)} className="rounded-lg">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlan(plan.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Stats Badges */}
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {formatHoursHMS(plan.daily_hours || 1.5)}/dia
                      </div>
                      {Boolean(plan.total_hours && plan.total_hours > 0) && (
                        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent font-medium">
                          <BookOpen className="h-3.5 w-3.5" />
                          {Math.round(plan.total_hours)}h total
                        </div>
                      )}
                      {plan.study_plan_courses && plan.study_plan_courses.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground font-medium">
                          {plan.study_plan_courses.length} curso{plan.study_plan_courses.length === 1 ? '' : 's'}
                        </div>
                      )}
                    </div>

                    {/* Estimated Completion Date */}
                    {(() => {
                      const estimatedDate = calculateEstimatedCompletion(plan);
                      const endDate = safeParseISO(plan.end_date);
                      if (!estimatedDate) return null;
                      
                      const isOnTime = endDate && estimatedDate <= endDate;
                      const daysOver = endDate ? differenceInDays(estimatedDate, endDate) : 0;
                      
                      return (
                        <div className={cn(
                          "flex items-center gap-2 text-xs px-3 py-2 rounded-xl font-medium",
                          isOnTime 
                            ? "bg-success/10 text-success border border-success/20" 
                            : "bg-destructive/10 text-destructive border border-destructive/20"
                        )}>
                          <CalendarCheck className="h-4 w-4" />
                          <span>
                            Conclusão prevista: {format(estimatedDate, "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          {!isOnTime && daysOver > 0 && (
                            <span className="text-[10px] opacity-75 bg-destructive/20 px-1.5 py-0.5 rounded-full">
                              +{daysOver} dias
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* Associated Courses */}
                    {plan.study_plan_courses && plan.study_plan_courses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Cursos incluídos:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.study_plan_courses.slice(0, 3).map((pc, idx) => (
                            <Badge 
                              key={idx} 
                              className={cn(
                                "text-[11px] py-1 px-2 bg-gradient-to-r from-muted/80 to-muted/50 text-foreground border-0 truncate max-w-[140px] rounded-lg font-medium",
                                pc.is_fixed && "ring-1 ring-primary/40"
                              )}
                            >
                              {pc.is_fixed && <span className="mr-1">📌</span>}
                              {pc.courses?.name}
                            </Badge>
                          ))}
                          {plan.study_plan_courses.length > 3 && (
                            <Badge variant="outline" className="text-[11px] py-1 px-2 rounded-lg">
                              +{plan.study_plan_courses.length - 3} mais
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Horários de estudo configurados */}
                    {(() => {
                      const planBlocks = timeBlocks.filter((b) => b.study_plan_id === plan.id);
                      if (planBlocks.length === 0) return null;
                      const dayOrder = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
                      const dayShort: Record<string, string> = {
                        monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua', thursday: 'Qui',
                        friday: 'Sex', saturday: 'Sáb', sunday: 'Dom',
                      };
                      const sorted = [...planBlocks].sort((a, b) => {
                        const da = dayOrder.indexOf(a.day_of_week);
                        const db = dayOrder.indexOf(b.day_of_week);
                        if (da !== db) return da - db;
                        return a.start_time.localeCompare(b.start_time);
                      });
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              Horários de estudo:
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTimeDialogDay(undefined);
                                setTimeDialogOpen(true);
                              }}
                              className="text-[10px] text-primary hover:underline font-medium"
                            >
                              Editar
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {sorted.slice(0, 6).map((b) => (
                              <Badge
                                key={b.id}
                                variant="outline"
                                className="text-[10px] py-0.5 px-1.5 rounded-md font-medium bg-primary/5 border-primary/20 text-primary"
                              >
                                {dayShort[b.day_of_week]} {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                              </Badge>
                            ))}
                            {sorted.length > 6 && (
                              <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 rounded-md">
                                +{sorted.length - 6}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Study Days */}
                    {plan.study_days && plan.study_days.length > 0 && (
                      <div className="flex gap-1.5 justify-center py-2">
                        {[
                          { label: 'S', id: 'monday' },
                          { label: 'T', id: 'tuesday' },
                          { label: 'Q', id: 'wednesday' },
                          { label: 'Q', id: 'thursday' },
                          { label: 'S', id: 'friday' },
                          { label: 'S', id: 'saturday' },
                          { label: 'D', id: 'sunday' },
                        ].map((day) => {
                          const isActiveDay = plan.study_days?.includes(day.id);
                          return (
                            <span 
                              key={day.id} 
                              className={cn(
                                "w-7 h-7 flex items-center justify-center text-xs rounded-lg font-bold transition-all",
                                isActiveDay 
                                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20" 
                                  : "bg-muted/30 text-muted-foreground/50"
                              )}
                            >
                              {day.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Progress Bar */}
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Progresso do período</span>
                        <span className="font-bold text-primary">{progress}%</span>
                      </div>
                      <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500 shadow-sm",
                            isActive 
                              ? "bg-gradient-to-r from-primary via-primary to-accent" 
                              : "bg-gradient-to-r from-muted-foreground/50 to-muted-foreground/30"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  );
                })()}
                </motion.div>
                  )}
                </SortablePlanCard>
              );
            })}
          </motion.div>
          </SortableContext>
          </DndContext>
        ))}
      </div>

      {/* Planning Form Dialog */}
      <PlanningFormDialog
        open={showFormDialog}
        onOpenChange={(open) => {
          setShowFormDialog(open);
          if (!open) setFormInitialCategory(undefined);
        }}
        onSuccess={fetchPlans}
        initialPlanningCategory={formInitialCategory}
        editPlan={editPlan}
      />

      <TimeBlockDialog
        open={timeDialogOpen}
        onOpenChange={setTimeDialogOpen}
        plans={planOptions}
        timeBlocks={timeBlocks}
        defaultDay={timeDialogDay}
        onChanged={fetchTimeBlocks}
      />

      {/* Plan Details Dialog */}
      <PlanDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        plan={selectedPlan}
        onPlanUpdated={fetchPlans}
      />
    </motion.div>
  );
}
