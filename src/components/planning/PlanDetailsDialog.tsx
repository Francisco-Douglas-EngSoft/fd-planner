import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Calendar, CheckCircle, Shield, AlertTriangle, GripVertical, Zap, Timer, BarChart3, CheckCircle2, CalendarClock, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BurndownChart } from './BurndownChart';
import { DailyProgressReport } from './DailyProgressReport';
import { CompleteCourseDialog } from './CompleteCourseDialog';
import { AcademicCalendar } from './AcademicCalendar';
import { CourseScheduleDialog } from './CourseScheduleDialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface StudyPlanCourse {
  id?: string;
  course_id: string;
  allocated_hours: number | null;
  sequence_order?: number | null;
  is_completed?: boolean | null;
  courses: {
    name: string;
    total_hours: number | null;
    completed_hours?: number | null;
  };
}

interface StudyPlan {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  daily_hours: number | null;
  study_days: string[] | null;
  total_hours: number | null;
  created_at: string;
  effective_start_date?: string | null;
  study_plan_courses?: StudyPlanCourse[];
}

interface PlanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: StudyPlan | null;
  onPlanUpdated?: () => void;
}

const daysTranslation: Record<string, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

// Format hours as HH:MM:SS
const formatHoursHMS = (hours: number): string => {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Calculate actual study days in period
const safeParseISO = (value: string) => {
  const d = parseISO(value);
  return isValid(d) ? d : null;
};

const calculateStudyDays = (startDate: string, endDate: string, studyDays: string[]): number => {
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const start = safeParseISO(startDate);
  const end = safeParseISO(endDate);
  if (!start || !end) return 0;

  const totalDays = differenceInDays(end, start) + 1;
  if (totalDays <= 0) return 0;

  const selectedDayNumbers = studyDays.map(d => dayMap[d]);

  let count = 0;
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    if (selectedDayNumbers.includes(date.getDay())) {
      count++;
    }
  }

  return count;
};

// Sortable Course Card Component
interface SortableCourseCardProps {
  pc: StudyPlanCourse;
  idx: number;
  dailyHoursForCourse: number; // Proportional daily hours for THIS specific course
  studyDays: string[];
  courseStartDate: Date;
  courseEndDate: Date;
  isCurrentCourse: boolean;
  isPastCourse: boolean;
  isBehindSchedule: boolean;
  behindPercent: number;
  sequenceInfo: string; // Info about which sequence this course belongs to
  onRequestComplete: (courseId: string, courseName: string) => void;
  isCompleted: boolean;
  isFutureStart: boolean; // Course starts in the future (after effective_start_date)
  daysUntilStart: number; // Days until course starts
  onCardClick: () => void;
  justDraggedRef: React.MutableRefObject<number>;
}

function SortableCourseCard({ 
  pc, 
  idx,
  dailyHoursForCourse, 
  studyDays, 
  courseStartDate, 
  courseEndDate,
  isCurrentCourse,
  isPastCourse,
  isBehindSchedule,
  behindPercent,
  sequenceInfo,
  onRequestComplete,
  isCompleted,
  isFutureStart,
  daysUntilStart,
  onCardClick,
  justDraggedRef,
}: SortableCourseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pc.course_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  // Evita disparar o clique de abrir o curso quando o usuário acabou de arrastar.
  // Usa timestamp do último drag-end (definido no DndContext do pai) como guarda
  // — qualquer click até 300ms depois do drag é considerado parte do gesto de arrastar.
  const onClickGuard = (e: React.MouseEvent) => {
    if (isDragging || Date.now() - justDraggedRef.current < 300) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onCardClick();
  };

  const courseTotalHours = pc.courses?.total_hours || 0;
  const completedHours = pc.courses?.completed_hours || 0;
  const remainingHours = Math.max(0, courseTotalHours - completedHours);
  const courseProgress = courseTotalHours > 0 
    ? Math.round((completedHours / courseTotalHours) * 100) 
    : 0;
  
  // Calculate study days needed for this course based on its proportional daily hours
  const courseStudyDays = dailyHoursForCourse > 0 
    ? courseTotalHours / dailyHoursForCourse 
    : 0;
  
  // Calculate remaining days to complete
  const remainingDays = dailyHoursForCourse > 0 
    ? remainingHours / dailyHoursForCourse 
    : 0;

  // Format remaining time as human readable
  const formatRemainingTime = (days: number): string => {
    if (days <= 0) return 'Concluído';
    if (days < 1) {
      const hours = days * dailyHoursForCourse;
      return `~${Math.ceil(hours)}h restantes`;
    }
    if (days < 7) {
      return `~${Math.ceil(days)} dia${Math.ceil(days) > 1 ? 's' : ''}`;
    }
    const weeks = days / 7;
    if (weeks < 4) {
      return `~${Math.ceil(weeks)} semana${Math.ceil(weeks) > 1 ? 's' : ''}`;
    }
    const months = days / 30;
    return `~${months.toFixed(1).replace('.', ',')} mês${months >= 2 ? 'es' : ''}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClickGuard}
      {...attributes}
      {...listeners}
      className={`p-4 rounded-lg border transition-all relative cursor-pointer hover:shadow-md select-none touch-none ${
        isDragging ? 'shadow-2xl ring-2 ring-primary scale-[1.02] rotate-[0.4deg] bg-primary/5' : ''
      } ${
        isBehindSchedule && isCurrentCourse
          ? 'bg-orange-500/10 border-orange-500/50 ring-2 ring-orange-500/30'
          : isCurrentCourse 
            ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/30' 
            : isPastCourse
              ? 'bg-muted/30 border-border/30 opacity-60'
              : 'bg-muted/50 border-border/50'
      }`}
    >
      {/* Dragging indicator */}
      {isDragging && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-lg z-10 animate-pulse pointer-events-none">
          <GripVertical className="h-3 w-3" />
          Arrastando...
        </div>
      )}
      {/* Behind Schedule Alert */}
      {isBehindSchedule && isCurrentCourse && (
        <div className="absolute -top-2 -left-2 flex items-center gap-1 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg animate-pulse">
          <AlertTriangle className="h-3 w-3" />
          {behindPercent}% Atrasado
        </div>
      )}
      
      {/* Current Course Indicator */}
      {isCurrentCourse && !isBehindSchedule && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium shadow-lg animate-pulse">
          <Zap className="h-3 w-3" />
          Estudando Agora
        </div>
      )}
      
      {isCurrentCourse && isBehindSchedule && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium shadow-lg">
          <Zap className="h-3 w-3" />
          Em Andamento
        </div>
      )}
      
      {/* Future Start Indicator */}
      {isFutureStart && !isCurrentCourse && !isPastCourse && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg">
          <CalendarClock className="h-3 w-3" />
          Inicia em {daysUntilStart} dia{daysUntilStart > 1 ? 's' : ''}
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-3">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-background/50 rounded transition-colors"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className={`w-2 h-10 rounded-full ${
          isCurrentCourse ? 'bg-primary animate-pulse' : isPastCourse ? 'bg-muted-foreground/50' : 'bg-primary'
        }`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-medium text-lg ${isPastCourse ? 'text-muted-foreground' : ''}`}>
              {pc.courses?.name}
            </p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-muted/50">
              {sequenceInfo}
            </Badge>
            {isPastCourse && courseProgress >= 100 && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-600 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Concluído
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Progress 
                value={courseProgress} 
                className={`h-2 flex-1 max-w-[200px] ${
                  isCurrentCourse ? '[&>div]:bg-primary' : ''
                }`}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {courseProgress}%
              </span>
            </div>
            {/* Remaining Time Indicator */}
            {courseProgress < 100 && (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                isCurrentCourse 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Timer className="h-3 w-3" />
                <span className="font-medium">{formatRemainingTime(remainingDays)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Grid - responsivo: 2 cols mobile, 3 sm, 5 lg */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3">
        <div className="p-2 sm:p-3 rounded bg-background/50 text-center min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 truncate">Total Curso</p>
          <p className="text-xs sm:text-sm font-bold font-mono truncate">
            {formatHoursHMS(courseTotalHours)}
          </p>
        </div>
        <div className="p-2 sm:p-3 rounded bg-background/50 text-center min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 truncate">Horas/Dia</p>
          <p className="text-xs sm:text-sm font-bold font-mono text-primary truncate">
            {formatHoursHMS(dailyHoursForCourse)}
          </p>
        </div>
        <div className="p-2 sm:p-3 rounded bg-background/50 text-center min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 truncate">Dias Estudo</p>
          <p className="text-xs sm:text-sm font-bold font-mono text-accent truncate">
            {courseStudyDays.toFixed(1).replace('.', ',')}
          </p>
        </div>
        <div className="p-2 sm:p-3 rounded bg-background/50 text-center min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 truncate">Início</p>
          <p className="text-xs sm:text-sm font-bold font-mono truncate">
            {format(courseStartDate, 'dd/MM/yy', { locale: ptBR })}
          </p>
        </div>
        <div className="p-2 sm:p-3 rounded bg-background/50 text-center min-w-0 col-span-2 sm:col-span-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 truncate">Final</p>
          <p className="text-xs sm:text-sm font-bold font-mono truncate">
            {format(courseEndDate, 'dd/MM/yy', { locale: ptBR })}
          </p>
        </div>
      </div>
      
      {/* Behind Schedule Warning */}
      {isBehindSchedule && isCurrentCourse && (
        <div className="mt-3 p-3 rounded-lg bg-orange-500/20 border border-orange-500/30 text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-600 dark:text-orange-400">Curso atrasado</p>
              <p className="text-muted-foreground mt-1">
                Considere dedicar mais tempo a este curso para recuperar o cronograma.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Remaining Hours Detail */}
      {!isCompleted && courseProgress < 100 && remainingHours > 0 && (
        <div className="mt-3 p-2 rounded bg-background/30 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Restam <span className="font-mono font-medium text-foreground">{formatHoursHMS(remainingHours)}</span> de estudo
          </span>
          <span className="text-muted-foreground">
            ≈ <span className="font-medium text-foreground">{remainingDays.toFixed(1).replace('.', ',')}</span> dias de estudo
          </span>
        </div>
      )}
      
      {/* Complete Course Button */}
      {!isCompleted && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/30"
          onClick={(e) => {
            e.stopPropagation();
            onRequestComplete(pc.course_id, pc.courses?.name || 'Curso');
          }}
        >
          <CheckCircle2 className="h-4 w-4" />
          Marcar como Concluído
        </Button>
      )}
      
      {/* Completed Badge */}
      {isCompleted && (
        <div className="mt-3 p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-600">Curso concluído e removido do planejamento</span>
        </div>
      )}
    </div>
  );
}

export function PlanDetailsDialog({ open, onOpenChange, plan, onPlanUpdated }: PlanDetailsDialogProps) {
  const today = new Date();
  const [orderedCourses, setOrderedCourses] = useState<StudyPlanCourse[]>([]);
  const [hasSyncedHours, setHasSyncedHours] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [courseToComplete, setCourseToComplete] = useState<{ id: string; name: string } | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState<{
    courseId: string;
    courseName: string;
    totalHours: number;
    completedHours: number;
    startDate: string;
  } | null>(null);

  // Drag state: tracks which course is being dragged + timestamp guard to suppress
  // the click that fires right after a drag completes (prevents opening the course).
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const justDraggedRef = useRef<number>(0);

  const sensors = useSensors(
    // Hold-to-drag: clique simples abre o curso, segurar 220ms inicia o arraste
    useSensor(PointerSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Reset sync flag when dialog closes
  useEffect(() => {
    if (!open) {
      setHasSyncedHours(false);
    }
  }, [open]);

  // Update ordered courses when plan changes
  useEffect(() => {
    if (plan?.study_plan_courses) {
      const sorted = [...plan.study_plan_courses].sort((a, b) => 
        (a.sequence_order || 0) - (b.sequence_order || 0)
      );
      setOrderedCourses(sorted);
    }
  }, [plan?.study_plan_courses]);

  // Calculate all values conditionally based on plan existence
  const start = plan ? safeParseISO(plan.start_date) : null;
  const end = plan ? safeParseISO(plan.end_date) : null;

  const totalDays = plan && start && end ? differenceInDays(end, start) + 1 : 0;
  const elapsedDays = plan && start ? Math.max(0, differenceInDays(today, start)) : 0;
  const progress = !plan || !start || !end || totalDays <= 0
    ? 0
    : today < start
      ? 0
      : today > end
        ? 100
        : Math.round((elapsedDays / totalDays) * 100);

  const studyDays = plan?.study_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const totalStudyDays = plan && start && end ? calculateStudyDays(plan.start_date, plan.end_date, studyDays) : 0;

  const dailyHours = plan?.daily_hours || 1.5;
  const totalAvailableHours = totalStudyDays * dailyHours;

  // Calculate total hours from all courses
  const totalCourseHours = orderedCourses.reduce((sum, pc) => {
    return sum + (pc.courses?.total_hours || 0);
  }, 0) || 0;

  // Calculate total completed hours from all courses
  const totalCompletedHours = orderedCourses.reduce((sum, pc) => {
    return sum + (pc.courses?.completed_hours || 0);
  }, 0) || 0;

  // Calculate coverage percentage
  const coveragePercentage = totalCourseHours > 0 
    ? Math.min(100, Math.round((totalAvailableHours / totalCourseHours) * 100))
    : 0;
  const isFullCoverage = totalAvailableHours >= totalCourseHours && totalCourseHours > 0;

  // Recalculate allocated hours based on proportional distribution
  const getCalculatedAllocatedHours = (courseTotalHours: number) => {
    if (totalCourseHours === 0) return 0;
    const proportion = courseTotalHours / totalCourseHours;
    // If available hours >= total course hours, allocate full course hours
    if (totalAvailableHours >= totalCourseHours) {
      return courseTotalHours;
    }
    // Otherwise, distribute proportionally
    return totalAvailableHours * proportion;
  };

  // Handle drag start - track which course is being dragged for visual overlay
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  // Handle drag end - reorder visually and update sequence_order sequentially
  // Each course gets its own sequence_order based on position (1, 2, 3, ...)
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    // Mark drag-end timestamp so the card's onClick guard can suppress the
    // synthetic click that fires immediately after a drag completes.
    justDraggedRef.current = Date.now();
    const { active, over } = event;

    if (!over || active.id === over.id || !plan) return;

    const oldIndex = orderedCourses.findIndex(c => c.course_id === active.id);
    const newIndex = orderedCourses.findIndex(c => c.course_id === over.id);

    // Reorder the array
    const reorderedCourses = arrayMove(orderedCourses, oldIndex, newIndex);
    
    // Assign new sequential sequence_order based on position
    const updatedCourses = reorderedCourses.map((c, idx) => ({
      ...c,
      sequence_order: idx + 1
    }));
    
    setOrderedCourses(updatedCourses);

    // Update all courses in database with new sequence_order
    try {
      for (const course of updatedCourses) {
        await supabase
          .from('study_plan_courses')
          .update({ sequence_order: course.sequence_order })
          .eq('study_plan_id', plan.id)
          .eq('course_id', course.course_id);
      }
      
      toast.success('Ordem dos cursos atualizada!');
      onPlanUpdated?.();
    } catch (error) {
      console.error('Error updating course order:', error);
      toast.error('Erro ao reordenar cursos');
    }
  };

  // Handle course completion - removes from plan and updates course status
  const handleCompleteCourse = async (courseId: string) => {
    if (!plan) return;
    
    try {
      // 1. Mark course as completed in the courses table
      await supabase
        .from('courses')
        .update({ 
          status: 'completed'
        })
        .eq('id', courseId);

      // 2. Remove course from study_plan_courses
      await supabase
        .from('study_plan_courses')
        .delete()
        .eq('study_plan_id', plan.id)
        .eq('course_id', courseId);

      // 3. Reorder remaining courses - update sequence_order
      const remainingCourses = orderedCourses
        .filter(c => c.course_id !== courseId)
        .map((c, idx) => ({
          ...c,
          sequence_order: idx + 1
        }));

      // Update sequence orders in database
      for (const course of remainingCourses) {
        await supabase
          .from('study_plan_courses')
          .update({ sequence_order: course.sequence_order })
          .eq('study_plan_id', plan.id)
          .eq('course_id', course.course_id);
      }

      // 4. Recalculate total hours for the plan
      const newTotalHours = remainingCourses.reduce((sum, c) => sum + (c.courses?.total_hours || 0), 0);
      
      // 5. Set effective_start_date to today + 2 days for remaining courses calculation
      const effectiveStartDate = new Date();
      effectiveStartDate.setDate(effectiveStartDate.getDate() + 2);
      const effectiveStartDateStr = effectiveStartDate.toISOString().split('T')[0];
      
      await supabase
        .from('study_plans')
        .update({ 
          total_hours: newTotalHours,
          effective_start_date: effectiveStartDateStr
        })
        .eq('id', plan.id);

      // Update local state
      setOrderedCourses(remainingCourses);
      
      toast.success('Curso concluído! O próximo curso iniciará em 2 dias.');
      onPlanUpdated?.();
    } catch (error) {
      console.error('Error completing course:', error);
      toast.error('Erro ao concluir curso');
    }
  };

  // Calculate course dates based on sequence_order
  // Courses with the same sequence_order run in parallel (same dates)
  // Courses with different sequence_order run sequentially
  // NOW USES REMAINING HOURS (total - completed) for dynamic recalculation
  const getCourseDates = () => {
    if (!start || !end) return orderedCourses.map(() => ({ start: new Date(), end: new Date() }));
    
    const planStart = new Date(start);
    const planEnd = new Date(end);
    
    // Use effective_start_date if available, or today if it's after plan start
    const effectiveStart = plan?.effective_start_date 
      ? safeParseISO(plan.effective_start_date) 
      : null;
    
    // For ongoing plans, use today as the calculation start if it's after plan start
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    
    let calculationStart: Date;
    if (effectiveStart && effectiveStart > planStart) {
      calculationStart = effectiveStart;
    } else if (todayDate > planStart && todayDate < planEnd) {
      calculationStart = todayDate;
    } else {
      calculationStart = planStart;
    }
    
    // Group courses by sequence_order
    const coursesBySequence: Map<number, StudyPlanCourse[]> = new Map();
    orderedCourses.forEach(pc => {
      const seq = pc.sequence_order || 1;
      if (!coursesBySequence.has(seq)) {
        coursesBySequence.set(seq, []);
      }
      coursesBySequence.get(seq)!.push(pc);
    });
    
    // Sort sequence orders
    const sequenceOrders = Array.from(coursesBySequence.keys()).sort((a, b) => a - b);
    
    // Calculate dates for each sequence group
    const sequenceDates: Map<number, { start: Date; end: Date }> = new Map();
    let currentStartDate = new Date(calculationStart);
    
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const selectedDayNumbers = studyDays.map(d => dayMap[d]);
    
    // Helper to find the date after N study days from a start date
    const addStudyDays = (fromDate: Date, numStudyDays: number): Date => {
      if (numStudyDays <= 0) return new Date(fromDate);
      let count = 0;
      const d = new Date(fromDate);
      // First check if the starting day is a study day
      if (selectedDayNumbers.includes(d.getDay())) {
        count = 1;
        if (count >= numStudyDays) return d;
      }
      // Continue finding study days
      while (count < numStudyDays) {
        d.setDate(d.getDate() + 1);
        if (selectedDayNumbers.includes(d.getDay())) {
          count++;
        }
      }
      return d;
    };
    
    // Helper to find next study day (or same day if it's a study day)
    const findNextStudyDay = (fromDate: Date): Date => {
      const d = new Date(fromDate);
      while (!selectedDayNumbers.includes(d.getDay())) {
        d.setDate(d.getDate() + 1);
      }
      return d;
    };
    
    for (const seqOrder of sequenceOrders) {
      const coursesInSeq = coursesBySequence.get(seqOrder)!;
      
      // Calculate REMAINING hours in this sequence group (total - completed)
      const remainingHoursInSeq = coursesInSeq.reduce((sum, pc) => {
        const totalH = pc.courses?.total_hours || 0;
        const completedH = pc.courses?.completed_hours || 0;
        return sum + Math.max(0, totalH - completedH);
      }, 0);
      
      // Calculate study days needed based on REMAINING hours
      const studyDaysNeeded = dailyHours > 0 ? Math.ceil(remainingHoursInSeq / dailyHours) : 0;
      
      // Find the start date (first study day from currentStartDate)
      const seqStartDate = findNextStudyDay(currentStartDate);
      
      // Find the end date by adding required study days
      let seqEndDate: Date;
      if (studyDaysNeeded <= 0) {
        seqEndDate = new Date(seqStartDate);
      } else {
        seqEndDate = addStudyDays(seqStartDate, studyDaysNeeded);
      }
      
      sequenceDates.set(seqOrder, { start: seqStartDate, end: seqEndDate });
      
      // Next sequence starts after this one ends (next day after the end date)
      currentStartDate = new Date(seqEndDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1);
    }
    
    // Map each course to its sequence dates
    return orderedCourses.map(pc => {
      const seq = pc.sequence_order || 1;
      return sequenceDates.get(seq) || { start: planStart, end: planEnd };
    });
  };

  const courseDates = getCourseDates();

  // Calculate recalculated end date based on remaining hours
  const calculateRecalculatedEndDate = (): Date | null => {
    if (!start || !end || orderedCourses.length === 0) return null;
    
    const planStart = new Date(start);
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    
    // Use effective_start_date if available, or today if it's after plan start
    const effectiveStart = plan?.effective_start_date 
      ? safeParseISO(plan.effective_start_date) 
      : null;
    
    let calculationStart: Date;
    if (effectiveStart && effectiveStart > planStart) {
      calculationStart = effectiveStart;
    } else if (todayDate > planStart) {
      calculationStart = todayDate;
    } else {
      calculationStart = planStart;
    }
    
    // Calculate total remaining hours
    const totalRemainingHours = orderedCourses.reduce((sum, pc) => {
      const totalH = pc.courses?.total_hours || 0;
      const completedH = pc.courses?.completed_hours || 0;
      return sum + Math.max(0, totalH - completedH);
    }, 0);
    
    if (totalRemainingHours <= 0) return calculationStart;
    
    const studyDaysNeeded = dailyHours > 0 ? Math.ceil(totalRemainingHours / dailyHours) : 0;
    
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const selectedDayNumbers = studyDays.map(d => dayMap[d]);
    
    // Find next study day
    const findNextStudyDay = (fromDate: Date): Date => {
      const d = new Date(fromDate);
      while (!selectedDayNumbers.includes(d.getDay())) {
        d.setDate(d.getDate() + 1);
      }
      return d;
    };
    
    // Add study days
    const addStudyDays = (fromDate: Date, numStudyDays: number): Date => {
      if (numStudyDays <= 0) return new Date(fromDate);
      let count = 0;
      const d = new Date(fromDate);
      if (selectedDayNumbers.includes(d.getDay())) {
        count = 1;
        if (count >= numStudyDays) return d;
      }
      while (count < numStudyDays) {
        d.setDate(d.getDate() + 1);
        if (selectedDayNumbers.includes(d.getDay())) {
          count++;
        }
      }
      return d;
    };
    
    const startDate = findNextStudyDay(calculationStart);
    return addStudyDays(startDate, studyDaysNeeded);
  };

  const recalculatedEndDate = calculateRecalculatedEndDate();
  const originalEndDate = end;
  
  // Calculate difference in days
  const getDateDifference = () => {
    if (!recalculatedEndDate || !originalEndDate) return { days: 0, status: 'same' as const };
    const diff = differenceInDays(recalculatedEndDate, originalEndDate);
    if (diff > 0) return { days: diff, status: 'delayed' as const };
    if (diff < 0) return { days: Math.abs(diff), status: 'ahead' as const };
    return { days: 0, status: 'same' as const };
  };
  
  const dateDifference = getDateDifference();
  const isCriticalDelay = dateDifference.status === 'delayed' && dateDifference.days > 7;

  // Force recalculate plan dates
  const handleForceRecalculate = async () => {
    if (!plan || !recalculatedEndDate) return;
    
    setIsRecalculating(true);
    try {
      // Update plan end_date with recalculated date
      const newEndDate = recalculatedEndDate.toISOString().split('T')[0];
      
      await supabase
        .from('study_plans')
        .update({ end_date: newEndDate })
        .eq('id', plan.id);
      
      toast.success('Datas do planejamento recalculadas com sucesso!');
      onPlanUpdated?.();
    } catch (error) {
      console.error('Error recalculating dates:', error);
      toast.error('Erro ao recalcular datas');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Sync calculated hours with database when dialog opens (only once per open)
  useEffect(() => {
    const syncAllocatedHours = async () => {
      if (!open || !plan?.study_plan_courses?.length || hasSyncedHours) return;

      // Don't sync if plan dates are invalid (avoid zeroing data)
      const startDateObj = safeParseISO(plan.start_date);
      const endDateObj = safeParseISO(plan.end_date);
      if (!startDateObj || !endDateObj) return;

      // Calculate values inside useEffect to ensure they're current
      const studyDaysInEffect = plan.study_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const totalStudyDaysInEffect = calculateStudyDays(plan.start_date, plan.end_date, studyDaysInEffect);
      const dailyHoursInEffect = plan.daily_hours || 1.5;
      const totalAvailableHoursInEffect = totalStudyDaysInEffect * dailyHoursInEffect;
      
      const totalCourseHoursInEffect = plan.study_plan_courses.reduce((sum, pc) => {
        return sum + (pc.courses?.total_hours || 0);
      }, 0);

      const getCalculatedHours = (courseTotalHours: number) => {
        if (totalCourseHoursInEffect === 0) return 0;
        const proportion = courseTotalHours / totalCourseHoursInEffect;
        if (totalAvailableHoursInEffect >= totalCourseHoursInEffect) {
          return courseTotalHours;
        }
        return totalAvailableHoursInEffect * proportion;
      };

      try {
        const updates = plan.study_plan_courses.map((pc) => {
          const courseTotalHours = pc.courses?.total_hours || 0;
          const calculatedHours = getCalculatedHours(courseTotalHours);
          return {
            course_id: pc.course_id,
            calculatedHours,
            currentHours: pc.allocated_hours || 0,
          };
        });

        // Only update if there are differences
        const needsUpdate = updates.some(u => Math.abs(u.calculatedHours - u.currentHours) > 0.001);
        
        if (needsUpdate) {
          for (const update of updates) {
            await supabase
              .from('study_plan_courses')
              .update({ allocated_hours: update.calculatedHours })
              .eq('study_plan_id', plan.id)
              .eq('course_id', update.course_id);
          }
          
          // Also update total_hours on the plan
          const totalAllocated = updates.reduce((sum, u) => sum + u.calculatedHours, 0);
          await supabase
            .from('study_plans')
            .update({ total_hours: totalAllocated })
            .eq('id', plan.id);
        }
        
        // Mark as synced to prevent loop
        setHasSyncedHours(true);
      } catch (error) {
        console.error('Error syncing allocated hours:', error);
        setHasSyncedHours(true); // Prevent infinite retry on error
      }
    };

    syncAllocatedHours();
  }, [open, plan, hasSyncedHours]);

  // Return null after all hooks have been called
  if (!plan) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl">{plan.name}</SheetTitle>
          </div>
          {plan.description && (
            <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
          )}
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2 text-xs">
              <BookOpen className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="academic" className="flex items-center gap-2 text-xs">
              <Calendar className="h-4 w-4" />
              Acadêmico
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2 text-xs">
              <BarChart3 className="h-4 w-4" />
              Progresso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 py-4">
            {/* Critical Delay Alert */}
            {isCriticalDelay && (
              <div className="p-4 rounded-lg border-2 bg-red-500/10 border-red-500/50 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-600 dark:text-red-400 text-lg">
                        ⚠️ Atraso Crítico Detectado!
                      </span>
                      <Badge variant="destructive" className="bg-red-500 animate-bounce">
                        +{dateDifference.days} dias
                      </Badge>
                    </div>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-2">
                      O progresso atual indica que você terminará <strong>{dateDifference.days} dias</strong> após a data original. 
                      Considere aumentar suas horas diárias de estudo ou revisar seus objetivos.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleForceRecalculate}
                        disabled={isRecalculating}
                        className="gap-2 border-red-500/50 text-red-600 hover:bg-red-500/10"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                        Atualizar Data Final
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Coverage Indicator */}
            <div className={`p-4 rounded-lg border-2 ${
              isFullCoverage 
                ? 'bg-green-500/10 border-green-500/50' 
                : 'bg-orange-500/10 border-orange-500/50'
            }`}>
              <div className="flex items-center gap-3">
                {isFullCoverage ? (
                  <Shield className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isFullCoverage ? 'text-green-500' : 'text-orange-500'}`}>
                      {isFullCoverage ? 'Cobertura Completa!' : 'Cobertura Parcial'}
                    </span>
                    <Badge variant={isFullCoverage ? 'default' : 'secondary'} className={
                      isFullCoverage ? 'bg-green-500' : 'bg-orange-500'
                    }>
                      {coveragePercentage}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isFullCoverage 
                      ? 'Este plano cobre 100% da carga horária dos cursos selecionados.'
                      : `Este plano cobre ${coveragePercentage}% da carga total. Aumente os dias ou horas para cobertura completa.`
                    }
                  </p>
                </div>
              </div>
              <Progress 
                value={coveragePercentage} 
                className={`h-2 mt-3 ${isFullCoverage ? '[&>div]:bg-green-500' : '[&>div]:bg-orange-500'}`} 
              />
            </div>

            {/* Progress */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Progresso do Planejamento</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Conclusão</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            </div>

            {/* Burndown Chart */}
            {totalCourseHours > 0 && (
              <BurndownChart
                startDate={plan.start_date}
                endDate={plan.end_date}
                totalHours={totalCourseHours}
                completedHours={totalCompletedHours}
                studyDays={studyDays}
                dailyHours={dailyHours}
                planName={plan.name}
              />
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Horas/Dia</span>
                </div>
                <p className="text-xl font-bold font-mono">{formatHoursHMS(dailyHours)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-xs">Horas Totais Disponíveis</span>
                </div>
                <p className="text-xl font-bold font-mono">{formatHoursHMS(totalAvailableHours)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Dias de Estudo</span>
                </div>
                <p className="text-xl font-bold">{totalStudyDays}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs">Dias Totais do Período</span>
                </div>
                <p className="text-xl font-bold">{totalDays}</p>
              </div>
            </div>

            {/* Period with Date Comparison */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-muted-foreground">Período</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForceRecalculate}
                  disabled={isRecalculating || dateDifference.status === 'same'}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                  Recalcular Datas
                </Button>
              </div>
              
              {/* Original Period */}
              <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <span className="text-xs text-muted-foreground block">Data Original:</span>
                  <span>
                    {start && end
                      ? `${format(start, 'dd/MM/yyyy', { locale: ptBR })} - ${format(end, 'dd/MM/yyyy', { locale: ptBR })}`
                      : 'Datas inválidas'}
                  </span>
                </div>
              </div>
              
              {/* Recalculated End Date Comparison */}
              {recalculatedEndDate && start && (
                <div className={`p-3 rounded-lg border-2 ${
                  dateDifference.status === 'ahead' 
                    ? 'bg-green-500/10 border-green-500/50' 
                    : dateDifference.status === 'delayed'
                      ? 'bg-orange-500/10 border-orange-500/50'
                      : 'bg-muted/50 border-border'
                }`}>
                  <div className="flex items-center gap-3">
                    {dateDifference.status === 'ahead' ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : dateDifference.status === 'delayed' ? (
                      <TrendingDown className="h-5 w-5 text-orange-500" />
                    ) : (
                      <Minus className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Data Final Recalculada (baseada no progresso):</span>
                        {dateDifference.status !== 'same' && (
                          <Badge 
                            variant={dateDifference.status === 'ahead' ? 'default' : 'secondary'} 
                            className={`text-xs ${
                              dateDifference.status === 'ahead' 
                                ? 'bg-green-500' 
                                : 'bg-orange-500'
                            }`}
                          >
                            {dateDifference.status === 'ahead' 
                              ? `${dateDifference.days} dias antes` 
                              : `${dateDifference.days} dias depois`}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`font-medium ${
                          dateDifference.status === 'ahead' 
                            ? 'text-green-600' 
                            : dateDifference.status === 'delayed'
                              ? 'text-orange-600'
                              : ''
                        }`}>
                          {format(start, 'dd/MM/yyyy', { locale: ptBR })} - {format(recalculatedEndDate, 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {dateDifference.status === 'ahead' 
                          ? 'Você está adiantado! Seu progresso permite terminar mais cedo.'
                          : dateDifference.status === 'delayed'
                            ? 'O progresso atual indica que você precisará de mais tempo.'
                            : 'A data final está alinhada com o progresso atual.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Study Days */}
            {studyDays.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Dias de Estudo na Semana</h4>
                <div className="flex flex-wrap gap-2">
                  {studyDays.map((day) => (
                    <Badge key={day} variant="secondary">
                      {daysTranslation[day] || day}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Courses with Drag and Drop */}
            {orderedCourses.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Cursos ({orderedCourses.length})
                    </h4>
                    <span className="text-xs text-muted-foreground/70">
                      • Clique para abrir • Segure e arraste para reordenar
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Total: {formatHoursHMS(totalCourseHours)}
                  </span>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={() => {
                    setActiveDragId(null);
                    justDraggedRef.current = Date.now();
                  }}
                >
                  <SortableContext
                    items={orderedCourses.map(c => c.course_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {orderedCourses.map((pc, idx) => {
                        const courseStart = courseDates[idx]?.start || new Date();
                        const courseEnd = courseDates[idx]?.end || new Date();
                        const isCurrentCourse = today >= courseStart && today <= courseEnd;
                        const isPastCourse = today > courseEnd;
                        
                        // Calculate proportional daily hours for this course
                        // Find all courses with the same sequence_order
                        const seqOrder = pc.sequence_order || 1;
                        const coursesInSameSeq = orderedCourses.filter(c => (c.sequence_order || 1) === seqOrder);
                        const totalHoursInSeq = coursesInSameSeq.reduce((sum, c) => sum + (c.courses?.total_hours || 0), 0);
                        const courseHours = pc.courses?.total_hours || 0;
                        const proportion = totalHoursInSeq > 0 ? courseHours / totalHoursInSeq : 0;
                        const dailyHoursForCourse = dailyHours * proportion;
                        
                        // Sequence info for display
                        const sequenceInfo = `${seqOrder}ª Sequência (${coursesInSameSeq.length} curso${coursesInSameSeq.length > 1 ? 's paralelos' : ''})`;
                        
                        // Calculate if course is behind schedule
                        const courseTotalHours = pc.courses?.total_hours || 0;
                        const courseCompletedHours = pc.courses?.completed_hours || 0;
                        const courseTotalDays = differenceInDays(courseEnd, courseStart) + 1;
                        const courseElapsedDays = isCurrentCourse ? Math.max(0, differenceInDays(today, courseStart) + 1) : 0;
                        const expectedCourseProgress = courseTotalDays > 0 ? (courseElapsedDays / courseTotalDays) * courseTotalHours : 0;
                        const isBehindSchedule = isCurrentCourse && courseCompletedHours < expectedCourseProgress * 0.9;
                        const behindPercent = expectedCourseProgress > 0 
                          ? Math.round((1 - (courseCompletedHours / expectedCourseProgress)) * 100) 
                          : 0;
                        
                        // Calculate if this course starts in the future
                        const isFutureStart = courseStart > today;
                        const daysUntilStart = isFutureStart ? differenceInDays(courseStart, today) : 0;
                        
                        return (
                          <SortableCourseCard
                            key={pc.course_id}
                            pc={pc}
                            idx={idx}
                            dailyHoursForCourse={dailyHoursForCourse}
                            studyDays={studyDays}
                            courseStartDate={courseStart}
                            courseEndDate={courseEnd}
                            isCurrentCourse={isCurrentCourse}
                            isPastCourse={isPastCourse}
                            isBehindSchedule={isBehindSchedule}
                            behindPercent={behindPercent}
                            sequenceInfo={sequenceInfo}
                            onRequestComplete={(id, name) => {
                              setCourseToComplete({ id, name });
                              setConfirmDialogOpen(true);
                            }}
                            isCompleted={pc.is_completed || false}
                            isFutureStart={isFutureStart}
                            daysUntilStart={daysUntilStart}
                            justDraggedRef={justDraggedRef}
                            onCardClick={() => {
                              setScheduleDialog({
                                courseId: pc.course_id,
                                courseName: pc.courses?.name || 'Curso',
                                totalHours: pc.courses?.total_hours || 0,
                                completedHours: pc.courses?.completed_hours || 0,
                                startDate: courseStart.toISOString().split('T')[0],
                              });
                            }}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                  <DragOverlay dropAnimation={null}>
                    {activeDragId ? (
                      <div className="p-4 rounded-lg border-2 border-primary bg-primary/10 backdrop-blur-sm shadow-2xl ring-4 ring-primary/30 cursor-grabbing select-none">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <GripVertical className="h-4 w-4 animate-pulse" />
                          <span className="animate-pulse">Arrastando...</span>
                          <span className="text-foreground ml-1 truncate max-w-[220px]">
                            {orderedCourses.find(c => c.course_id === activeDragId)?.courses?.name}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            )}
          </TabsContent>

          <TabsContent value="academic" className="py-4">
            <AcademicCalendar
              planId={plan.id}
              planCourses={orderedCourses.map(pc => ({ id: pc.course_id, name: pc.courses?.name || 'Curso' }))}
            />
          </TabsContent>

          <TabsContent value="progress" className="py-4">
            <DailyProgressReport
              planId={plan.id}
              planName={plan.name}
              dailyHours={dailyHours}
              studyDays={studyDays}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>

      {/* Course Schedule Dialog (clicar no curso abre o cronograma detalhado) */}
      {scheduleDialog && plan && (
        <CourseScheduleDialog
          open={!!scheduleDialog}
          onOpenChange={(o) => !o && setScheduleDialog(null)}
          courseId={scheduleDialog.courseId}
          courseName={scheduleDialog.courseName}
          totalHours={scheduleDialog.totalHours}
          completedHours={scheduleDialog.completedHours}
          startDate={scheduleDialog.startDate}
          dailyHours={dailyHours}
          studyDays={studyDays}
          minDailyHours={(plan as { min_daily_hours?: number | null }).min_daily_hours}
          maxDailyHours={(plan as { max_daily_hours?: number | null }).max_daily_hours}
        />
      )}

      {/* Complete Course Confirmation Dialog */}
      <CompleteCourseDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        courseName={courseToComplete?.name || ''}
        onConfirm={() => {
          if (courseToComplete) {
            handleCompleteCourse(courseToComplete.id);
          }
          setConfirmDialogOpen(false);
          setCourseToComplete(null);
        }}
      />
    </Sheet>
  );
}
