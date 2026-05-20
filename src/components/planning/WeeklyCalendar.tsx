import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, BookOpen, Pin, Sparkles, Star, Coffee, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';

const daysOfWeekFull = [
  { id: 'sunday', label: 'Domingo', abbrev: 'Dom', fullAbbrev: 'Domingo' },
  { id: 'monday', label: 'Segunda', abbrev: 'Seg', fullAbbrev: 'Segunda-feira' },
  { id: 'tuesday', label: 'Terça', abbrev: 'Ter', fullAbbrev: 'Terça-feira' },
  { id: 'wednesday', label: 'Quarta', abbrev: 'Qua', fullAbbrev: 'Quarta-feira' },
  { id: 'thursday', label: 'Quinta', abbrev: 'Qui', fullAbbrev: 'Quinta-feira' },
  { id: 'friday', label: 'Sexta', abbrev: 'Sex', fullAbbrev: 'Sexta-feira' },
  { id: 'saturday', label: 'Sábado', abbrev: 'Sáb', fullAbbrev: 'Sábado' },
];

const courseColors = [
  { bg: 'bg-gradient-to-br from-violet-500 to-purple-600', border: 'border-violet-400', glow: 'shadow-violet-500/30' },
  { bg: 'bg-gradient-to-br from-blue-500 to-cyan-600', border: 'border-blue-400', glow: 'shadow-blue-500/30' },
  { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', border: 'border-emerald-400', glow: 'shadow-emerald-500/30' },
  { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', border: 'border-amber-400', glow: 'shadow-amber-500/30' },
  { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', border: 'border-rose-400', glow: 'shadow-rose-500/30' },
  { bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', border: 'border-indigo-400', glow: 'shadow-indigo-500/30' },
];

const formatMinutesToHM = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

const formatMinutesToCompact = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}:${m.toString().padStart(2, '0')}`;
};

export interface CourseSchedule {
  courseName: string;
  dailyMinutes: number;
  color: string;
  isFixed: boolean;
  sequenceOrder: number;
  isCurrentInSequence: boolean;
  courseId?: string;
  completedHours?: number;
  totalHours?: number;
}

export interface StudyTimeBlock {
  id: string;
  study_plan_id: string;
  course_id: string | null;
  day_of_week: string;
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  block_type: 'study' | 'break';
  title: string | null;
}

interface WeeklyCalendarProps {
  weeklySchedule: Record<string, CourseSchedule[]>;
  timeBlocks?: StudyTimeBlock[];
  currentWeekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onGoToCurrentWeek: () => void;
  onCourseDrop?: (courseId: string, fromDay: string, toDay: string) => void;
  onAddTimeBlock?: (dayId?: string) => void;
}

const toMinutesFromTime = (time: string): number => {
  const [hh, mm] = time.split(':');
  const h = Number(hh || 0);
  const m = Number(mm || 0);
  return h * 60 + m;
};

const formatTimeHM = (time: string) => {
  const [hh, mm] = time.split(':');
  return `${(hh || '00').padStart(2, '0')}:${(mm || '00').padStart(2, '0')}`;
};

interface DraggableCourseProps {
  course: CourseSchedule;
  dayId: string;
  courseIdx: number;
  colorConfig: { bg: string; border: string; glow: string };
}

function DraggableCourse({ course, dayId, courseIdx, colorConfig }: DraggableCourseProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${dayId}-${course.courseId || course.courseName}-${courseIdx}`,
    data: {
      course,
      fromDay: dayId,
    },
  });

  const progressPercent = useMemo(() => {
    if (!course.totalHours || course.totalHours === 0) return 0;
    return Math.min(100, Math.round(((course.completedHours || 0) / course.totalHours) * 100));
  }, [course.completedHours, course.totalHours]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className={cn(
            "px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-white font-medium shadow-lg relative cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-[1.02] hover:shadow-xl animate-fade-in group/course",
            colorConfig.bg,
            colorConfig.glow,
            course.isFixed && "ring-2 ring-white/30",
            course.isCurrentInSequence && "ring-2 ring-yellow-300/60",
            isDragging && "opacity-50 scale-95"
          )}
          style={{ animationDelay: `${courseIdx * 50}ms` }}
        >
          {/* Drag Handle */}
          <div className="absolute left-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/course:opacity-60 transition-opacity">
            <GripVertical className="h-3 w-3" />
          </div>
          
          {/* Indicators */}
          <div className="absolute -top-1 -right-1 flex gap-0.5">
            {course.isFixed && (
              <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg" title="Curso Fixo">
                <Pin className="h-2.5 w-2.5 text-gray-700" />
              </span>
            )}
            {course.isCurrentInSequence && !course.isFixed && (
              <span className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg text-yellow-900 text-[9px] font-bold" title="Curso Atual">
                <Star className="h-2.5 w-2.5 fill-current" />
              </span>
            )}
          </div>
          
          {/* Course Name - Truncated */}
          <p className="truncate font-bold text-[10px] sm:text-xs leading-tight pr-4 pl-2 drop-shadow-sm">
            {course.courseName}
          </p>
          
          {/* Duration */}
          <div className="flex items-center gap-1 mt-1 opacity-90 pl-2">
            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="text-[9px] sm:text-[10px] font-semibold">
              {formatMinutesToCompact(course.dailyMinutes)}
            </span>
          </div>
          
          {/* Progress Bar */}
          {course.totalHours && course.totalHours > 0 && (
            <div className="mt-1.5 pl-2 pr-1">
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white/80 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[8px] font-bold opacity-80">{progressPercent}%</span>
              </div>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="max-w-[220px] p-3 bg-popover/95 backdrop-blur-sm border border-border/50"
      >
        <div className="space-y-1.5">
          <p className="font-bold text-sm">{course.courseName}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatMinutesToHM(course.dailyMinutes)}</span>
          </div>
          {course.totalHours && course.totalHours > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-semibold text-primary">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground">
                {(course.completedHours || 0).toFixed(1)}h / {course.totalHours}h concluídas
              </p>
            </div>
          )}
          {course.isFixed && (
            <div className="flex items-center gap-1.5 text-xs text-blue-500">
              <Pin className="h-3 w-3" />
              <span>Curso Fixo - Estuda diariamente</span>
            </div>
          )}
          {course.isCurrentInSequence && !course.isFixed && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-600">
              <Star className="h-3 w-3 fill-current" />
              <span>Curso atual na sequência</span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface DroppableDayProps {
  dayId: string;
  children: React.ReactNode;
  isOver: boolean;
}

function DroppableDay({ dayId, children, isOver }: DroppableDayProps) {
  const { setNodeRef } = useDroppable({
    id: dayId,
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "space-y-1.5 sm:space-y-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent transition-all duration-200",
        isOver && "bg-primary/10 rounded-lg ring-2 ring-primary/30 ring-dashed"
      )}
    >
      {children}
    </div>
  );
}

export function WeeklyCalendar({
  weeklySchedule,
  timeBlocks = [],
  currentWeekStart,
  onPreviousWeek,
  onNextWeek,
  onGoToCurrentWeek,
  onCourseDrop,
  onAddTimeBlock,
}: WeeklyCalendarProps) {
  const today = new Date();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<CourseSchedule | null>(null);
  const [overDayId, setOverDayId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const isCurrentWeek = useMemo(() => {
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 0 });
    return isSameDay(currentWeekStart, thisWeekStart);
  }, [currentWeekStart, today]);

  const totalWeeklyMinutes = useMemo(() => {
    return Object.values(weeklySchedule).reduce((total, courses) => {
      return total + courses.reduce((sum, c) => sum + c.dailyMinutes, 0);
    }, 0);
  }, [weeklySchedule]);

  const getColorConfig = (index: number) => courseColors[index % courseColors.length];

  const hasTimeBlocks = useMemo(() => (timeBlocks?.length || 0) > 0, [timeBlocks]);

  const courseColorById = useMemo(() => {
    const map = new Map<string, { bg: string; border: string; glow: string }>();
    Object.values(weeklySchedule).forEach((courses) => {
      courses.forEach((c, idx) => {
        if (!c.courseId) return;
        if (!map.has(c.courseId)) map.set(c.courseId, getColorConfig(c.sequenceOrder || idx));
      });
    });
    return map;
  }, [weeklySchedule]);

  // Agenda view constants (kept compact)
  const agendaStartHour = 6;
  const agendaEndHour = 23;
  const hourHeightPx = 44;
  const agendaStartMin = agendaStartHour * 60;
  const agendaTotalMin = (agendaEndHour - agendaStartHour) * 60;
  const agendaHeightPx = ((agendaEndHour - agendaStartHour) * hourHeightPx);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const data = event.active.data.current;
    if (data?.course) {
      setActiveCourse(data.course);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      setOverDayId(over.id as string);
    } else {
      setOverDayId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.data.current) {
      const fromDay = active.data.current.fromDay;
      const toDay = over.id as string;
      const course = active.data.current.course as CourseSchedule;
      
      if (fromDay !== toDay && course.courseId && onCourseDrop) {
        onCourseDrop(course.courseId, fromDay, toDay);
      }
    }
    
    setActiveId(null);
    setActiveCourse(null);
    setOverDayId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveCourse(null);
    setOverDayId(null);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-card via-card to-primary/5">
        {/* Header with navigation */}
        <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-4 md:px-6 border-b border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg md:text-xl font-bold tracking-tight">
                  Calendário Semanal
                </CardTitle>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Arraste cursos entre dias</p>
                  {totalWeeklyMinutes > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-semibold">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {formatMinutesToHM(totalWeeklyMinutes)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Navigation Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-muted/40 backdrop-blur-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border border-border/30 self-end sm:self-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onPreviousWeek} 
                    className="rounded-lg sm:rounded-xl h-7 w-7 sm:h-9 sm:w-9 p-0 hover:bg-background/80 transition-all"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Semana anterior</TooltipContent>
              </Tooltip>
              
              <span className="text-[10px] sm:text-sm font-semibold min-w-[100px] sm:min-w-[140px] md:min-w-[180px] text-center px-1 sm:px-2 capitalize">
                {format(weekDates[0], "dd MMM", { locale: ptBR })} — {format(weekDates[6], "dd MMM", { locale: ptBR })}
              </span>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onNextWeek} 
                    className="rounded-lg sm:rounded-xl h-7 w-7 sm:h-9 sm:w-9 p-0 hover:bg-background/80 transition-all"
                  >
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Próxima semana</TooltipContent>
              </Tooltip>
              
              {!isCurrentWeek && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={onGoToCurrentWeek} 
                  className="rounded-lg sm:rounded-xl ml-0.5 sm:ml-1 bg-gradient-to-r from-primary to-primary/90 text-[10px] sm:text-xs h-7 sm:h-9 px-2 sm:px-4 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                >
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                  <span className="hidden xs:inline">Hoje</span>
                </Button>
              )}

              {onAddTimeBlock && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddTimeBlock()}
                  className="rounded-lg sm:rounded-xl ml-0.5 sm:ml-1 h-7 sm:h-9 px-2 sm:px-3 text-[10px] sm:text-xs"
                >
                  Horários
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-2 sm:p-3 md:p-5">
          {/* Timeline indicator */}
          <div className="hidden sm:flex items-center gap-2 mb-3 sm:mb-4 px-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground font-medium px-2 sm:px-3">
              {format(weekDates[0], "MMMM yyyy", { locale: ptBR })}
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-border via-border to-transparent" />
          </div>
          
          {/* Calendar Grid with DnD - Horizontal scroll on mobile */}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="overflow-x-auto -mx-2 px-2 pb-2 sm:overflow-x-visible sm:mx-0 sm:px-0 sm:pb-0">
              <div className={cn(
                "grid gap-1 sm:gap-2 md:gap-3 min-w-[600px] sm:min-w-0",
                hasTimeBlocks ? "grid-cols-[40px_repeat(7,minmax(70px,1fr))] sm:grid-cols-[52px_repeat(7,minmax(0,1fr))]" : "grid-cols-7"
              )}>
              {/* Hour labels column (only when agenda view is active) */}
              {hasTimeBlocks && (
                <div className="hidden sm:block">
                  <div className="h-[78px]" />
                  <div className="relative" style={{ height: agendaHeightPx }}>
                    {Array.from({ length: agendaEndHour - agendaStartHour + 1 }, (_, i) => {
                      const hour = agendaStartHour + i;
                      const top = i * hourHeightPx;
                      return (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 flex items-start justify-end pr-2"
                          style={{ top }}
                        >
                          <span className="text-[10px] text-muted-foreground tabular-nums leading-none">
                            {String(hour).padStart(2, '0')}:00
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {daysOfWeekFull.map((day, idx) => {
                const dayDate = weekDates[idx];
                const isCurrentDay = isSameDay(dayDate, today);
                const dayCourses = weeklySchedule[day.id] || [];
                const dayTotalMinutes = dayCourses.reduce((sum, c) => sum + c.dailyMinutes, 0);
                const isPast = dayDate < today && !isCurrentDay;
                const isDropTarget = overDayId === day.id;
                const dayBlocks = (timeBlocks || []).filter(b => b.day_of_week === day.id);
                
                return (
                    <div
                    key={day.id}
                    className={cn(
                        "rounded-lg sm:rounded-xl md:rounded-2xl p-1.5 sm:p-2 md:p-3 min-h-[120px] sm:min-h-[160px] md:min-h-[200px] lg:min-h-[240px] border sm:border-2 transition-all duration-300 flex flex-col relative overflow-hidden group",
                      isCurrentDay 
                        ? "border-primary bg-gradient-to-b from-primary/15 via-primary/8 to-card shadow-xl sm:shadow-2xl shadow-primary/20 ring-1 ring-primary/20 sm:scale-[1.02] z-10" 
                        : isPast
                          ? "border-border/20 bg-muted/20 opacity-70 hover:opacity-100"
                          : "border-border/30 bg-card/70 hover:bg-card hover:border-border/50 hover:shadow-lg sm:hover:shadow-xl",
                      isDropTarget && "border-primary/50 bg-primary/5 scale-[1.01]"
                    )}
                  >
                    {/* Current day indicator bar */}
                    {isCurrentDay && (
                      <div className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 bg-gradient-to-r from-primary via-primary to-accent rounded-t-lg sm:rounded-t-xl" />
                    )}
                    
                    {/* Day Header */}
                    <div className="text-center mb-1.5 sm:mb-2 md:mb-3 relative">
                      {isCurrentDay && (
                        <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1">
                          <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-primary"></span>
                          </span>
                        </div>
                      )}
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className={cn(
                            "text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider cursor-default transition-colors",
                            isCurrentDay ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )}>
                            {day.abbrev}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="font-medium">
                          {day.fullAbbrev}
                        </TooltipContent>
                      </Tooltip>
                      
                      <p className={cn(
                        "text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold transition-all",
                        isCurrentDay 
                          ? "text-primary drop-shadow-sm" 
                          : "text-foreground group-hover:scale-105"
                      )}>
                        {format(dayDate, 'd')}
                      </p>
                      
                      {/* Total hours badge */}
                      {dayTotalMinutes > 0 && (
                        <div className={cn(
                          "mt-1 sm:mt-1.5 inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[9px] md:text-[10px] font-bold transition-all",
                          isCurrentDay 
                            ? "bg-primary/20 text-primary shadow-sm" 
                            : "bg-muted/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                          <Clock className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
                          {formatMinutesToCompact(dayTotalMinutes)}
                        </div>
                      )}
                    </div>
                    
                    {/* Courses / Agenda */}
                    {!hasTimeBlocks ? (
                      <DroppableDay dayId={day.id} isOver={isDropTarget}>
                        {dayCourses.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => onAddTimeBlock?.(day.id)}
                            className="w-full flex flex-col items-center justify-center h-full py-2 sm:py-3 animate-fade-in"
                          >
                            <div className={cn(
                              "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-1 sm:mb-2 transition-all",
                              isCurrentDay 
                                ? "bg-primary/10" 
                                : "bg-muted/40 group-hover:bg-muted/60"
                            )}>
                              <Coffee className={cn(
                                "h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:h-6 transition-colors",
                                isCurrentDay 
                                  ? "text-primary/60" 
                                  : "text-muted-foreground/40 group-hover:text-muted-foreground/60"
                              )} />
                            </div>
                            <p className={cn(
                              "text-[8px] sm:text-[10px] md:text-xs font-medium text-center transition-colors",
                              isCurrentDay 
                                ? "text-primary/70" 
                                : "text-muted-foreground/50 group-hover:text-muted-foreground/70"
                            )}>
                              Adicionar horários
                            </p>
                          </button>
                        ) : (
                          dayCourses.map((course, courseIdx) => {
                            const colorConfig = getColorConfig(course.sequenceOrder || courseIdx);
                            
                            return (
                              <DraggableCourse
                                key={`${course.courseId || course.courseName}-${courseIdx}`}
                                course={course}
                                dayId={day.id}
                                courseIdx={courseIdx}
                                colorConfig={colorConfig}
                              />
                            );
                          })
                        )}
                      </DroppableDay>
                    ) : (
                      <div className="relative flex-1">
                        <div
                          className="relative rounded-xl border border-border/30 bg-background/30 overflow-hidden"
                          style={{ height: agendaHeightPx }}
                        >
                          {/* Hour grid */}
                          {Array.from({ length: agendaEndHour - agendaStartHour + 1 }, (_, i) => (
                            <div
                              key={i}
                              className="absolute left-0 right-0 border-t border-border/20"
                              style={{ top: i * hourHeightPx }}
                            />
                          ))}

                          {/* Blocks */}
                          {dayBlocks.map((b) => {
                            const startMin = toMinutesFromTime(b.start_time) - agendaStartMin;
                            const endMin = toMinutesFromTime(b.end_time) - agendaStartMin;
                            const clampedStart = Math.max(0, Math.min(agendaTotalMin, startMin));
                            const clampedEnd = Math.max(0, Math.min(agendaTotalMin, endMin));
                            const top = (clampedStart / 60) * hourHeightPx;
                            const height = Math.max(18, ((clampedEnd - clampedStart) / 60) * hourHeightPx);

                            const courseColor = b.course_id ? courseColorById.get(b.course_id) : undefined;
                            const isBreak = b.block_type === 'break';

                            return (
                              <button
                                type="button"
                                key={b.id}
                                title={`${formatTimeHM(b.start_time)}–${formatTimeHM(b.end_time)} ${b.title || ''}`}
                                onClick={() => onAddTimeBlock?.(day.id)}
                                className={cn(
                                  "absolute left-1 right-1 rounded-lg px-2 py-1 text-left shadow-sm border",
                                  isBreak
                                    ? "bg-muted/70 text-foreground border-border/40"
                                    : cn("text-white", courseColor?.bg || "bg-primary", courseColor?.glow || "")
                                )}
                                style={{ top, height }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className={cn("truncate font-bold text-[10px] leading-tight", isBreak && "text-foreground")}>
                                    {b.title || (isBreak ? 'Descanso' : 'Estudo')}
                                  </p>
                                  <span className={cn("text-[9px] tabular-nums opacity-90", isBreak && "text-muted-foreground opacity-100")}>
                                    {formatTimeHM(b.start_time)}
                                  </span>
                                </div>
                                {!isBreak && b.course_id && (
                                  <p className="truncate text-[9px] opacity-90">{dayCourses.find(c => c.courseId === b.course_id)?.courseName || ''}</p>
                                )}
                              </button>
                            );
                          })}

                          {dayBlocks.length === 0 && (
                            <button
                              type="button"
                              onClick={() => onAddTimeBlock?.(day.id)}
                              className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground"
                            >
                              Clique para adicionar horários
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
            
            {/* Drag Overlay */}
            <DragOverlay>
              {activeId && activeCourse && (
                <div className={cn(
                  "px-3 py-2 rounded-xl text-white font-medium shadow-2xl transition-all",
                  getColorConfig(activeCourse.sequenceOrder || 0).bg,
                  "ring-2 ring-white/50 scale-105"
                )}>
                  <p className="truncate font-bold text-xs">{activeCourse.courseName}</p>
                  <div className="flex items-center gap-1 mt-1 opacity-90">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px] font-semibold">
                      {formatMinutesToCompact(activeCourse.dailyMinutes)}
                    </span>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
          
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-5 pt-4 border-t border-border/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary to-primary/80" />
              <span>Hoje</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Pin className="h-3 w-3" />
              <span>Curso Fixo</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              <span>Curso em Sequência</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Coffee className="h-3 w-3" />
              <span>Dia Livre</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <GripVertical className="h-3 w-3" />
              <span>Arraste para mover</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
