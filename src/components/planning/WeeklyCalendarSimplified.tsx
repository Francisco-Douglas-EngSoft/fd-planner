import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const daysOfWeek = [
  { id: 'sunday', label: 'Domingo', short: 'Dom' },
  { id: 'monday', label: 'Segunda', short: 'Seg' },
  { id: 'tuesday', label: 'Terça', short: 'Ter' },
  { id: 'wednesday', label: 'Quarta', short: 'Qua' },
  { id: 'thursday', label: 'Quinta', short: 'Qui' },
  { id: 'friday', label: 'Sexta', short: 'Sex' },
  { id: 'saturday', label: 'Sábado', short: 'Sáb' },
];

// Cores simples e distintas
const courseColors = [
  { bg: 'bg-blue-500', text: 'text-white', light: 'bg-blue-100', dark: 'bg-blue-900' },
  { bg: 'bg-green-500', text: 'text-white', light: 'bg-green-100', dark: 'bg-green-900' },
  { bg: 'bg-purple-500', text: 'text-white', light: 'bg-purple-100', dark: 'bg-purple-900' },
  { bg: 'bg-orange-500', text: 'text-white', light: 'bg-orange-100', dark: 'bg-orange-900' },
  { bg: 'bg-pink-500', text: 'text-white', light: 'bg-pink-100', dark: 'bg-pink-900' },
  { bg: 'bg-teal-500', text: 'text-white', light: 'bg-teal-100', dark: 'bg-teal-900' },
];

const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
};

export interface CourseSchedule {
  courseName: string;
  /** Linha secundária (ex.: curso do módulo). */
  detail?: string;
  dailyMinutes: number;
  color?: string;
  courseId?: string;
  completedHours?: number;
  totalHours?: number;
  isFixed?: boolean;
  sequenceOrder?: number;
  isCurrentInSequence?: boolean;
}

interface WeeklyCalendarSimplifiedProps {
  readonly weeklySchedule: Record<string, CourseSchedule[]>;
  readonly currentWeekStart: Date;
  readonly onPreviousWeek: () => void;
  readonly onNextWeek: () => void;
  readonly onGoToCurrentWeek: () => void;
}

export function WeeklyCalendarSimplified({
  weeklySchedule,
  currentWeekStart,
  onPreviousWeek,
  onNextWeek,
  onGoToCurrentWeek,
}: WeeklyCalendarSimplifiedProps) {
  const today = useMemo(() => new Date(), []);
  
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const isCurrentWeek = useMemo(() => {
    return weekDates.some(date => isSameDay(date, today));
  }, [weekDates, today]);

  const totalWeeklyMinutes = useMemo(() => {
    return Object.values(weeklySchedule).reduce((total, courses) => {
      return total + courses.reduce((sum, c) => sum + c.dailyMinutes, 0);
    }, 0);
  }, [weeklySchedule]);

  const getColorConfig = (index: number) => courseColors[index % courseColors.length];

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="overflow-hidden border shadow-lg">
        {/* Header */}
        <CardHeader className="pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Calendário Semanal
              </CardTitle>
              {totalWeeklyMinutes > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Total: <span className="font-semibold text-primary">{formatMinutes(totalWeeklyMinutes)}</span> por semana
                </p>
              )}
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-2 bg-background rounded-lg p-1 border">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onPreviousWeek}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm font-semibold min-w-[140px] text-center">
                {format(weekDates[0], "dd MMM", { locale: ptBR })} — {format(weekDates[6], "dd MMM", { locale: ptBR })}
              </span>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onNextWeek}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {!isCurrentWeek && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={onGoToCurrentWeek}
                  className="ml-1 h-8 px-3 text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Hoje
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-3">
            {daysOfWeek.map((day, idx) => {
              const dayDate = weekDates[idx];
              const isCurrentDay = isSameDay(dayDate, today);
              const dayCourses = weeklySchedule[day.id] || [];
              const dayTotalMinutes = dayCourses.reduce((sum, c) => sum + c.dailyMinutes, 0);
              const isPast = dayDate < today && !isCurrentDay;
              
              return (
                <div
                  key={day.id}
                  className={cn(
                    "rounded-lg p-3 min-h-[200px] border-2 transition-all flex flex-col",
                    isCurrentDay 
                      ? "border-primary bg-primary/5 shadow-md" 
                      : isPast
                      ? "border-border/30 bg-muted/20 opacity-60"
                      : "border-border bg-card hover:border-border/60"
                  )}
                >
                  {/* Day Header */}
                  <div className="text-center mb-3 pb-2 border-b">
                    <p className={cn(
                      "text-xs font-semibold uppercase tracking-wide mb-1",
                      isCurrentDay ? "text-primary" : "text-muted-foreground"
                    )}>
                      {day.short}
                    </p>
                    <p className={cn(
                      "text-2xl font-bold",
                      isCurrentDay ? "text-primary" : "text-foreground"
                    )}>
                      {format(dayDate, 'd')}
                    </p>
                    
                    {/* Total hours badge */}
                    {dayTotalMinutes > 0 && (
                      <div className={cn(
                        "mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                        isCurrentDay 
                          ? "bg-primary/20 text-primary" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Clock className="h-3 w-3" />
                        {formatMinutes(dayTotalMinutes)}
                      </div>
                    )}
                  </div>
                  
                  {/* Courses List */}
                  <div className="space-y-2 flex-1">
                    {dayCourses.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-muted-foreground text-center">
                          Sem estudos<br/>programados
                        </p>
                      </div>
                    ) : (
                      dayCourses.map((course, courseIdx) => {
                        const colorConfig = getColorConfig(course.sequenceOrder || courseIdx);
                        const progressPercent = course.totalHours && course.totalHours > 0
                          ? Math.min(100, Math.round(((course.completedHours || 0) / course.totalHours) * 100))
                          : 0;
                        
                        return (
                          <Tooltip key={`${course.courseId || course.courseName}-${courseIdx}`}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "p-2.5 rounded-lg transition-all cursor-default",
                                  colorConfig.bg,
                                  colorConfig.text
                                )}
                              >
                                {/* Course Name */}
                                <p className="font-semibold text-sm truncate">
                                  {course.courseName}
                                </p>
                                {course.detail && (
                                  <p className="text-[11px] opacity-80 truncate">{course.detail}</p>
                                )}
                                <div className="mb-1" />
                                
                                {/* Duration */}
                                <div className="flex items-center gap-1 text-xs opacity-90 mb-1.5">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatMinutes(course.dailyMinutes)}</span>
                                </div>
                                
                                {/* Progress Bar */}
                                {Boolean(course.totalHours && course.totalHours > 0) && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="opacity-80">Progresso</span>
                                      <span className="font-bold">{progressPercent}%</span>
                                    </div>
                                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-white/80 rounded-full transition-all w-0"
                                        style={{ width: `${progressPercent}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px]">
                              <div className="space-y-1">
                                <p className="font-bold">{course.courseName}</p>
                                {course.detail && <p className="text-xs text-muted-foreground">{course.detail}</p>}
                                <p className="text-xs text-muted-foreground">
                                  Tempo diário: {formatMinutes(course.dailyMinutes)}
                                </p>
                                {Boolean(course.totalHours && course.totalHours > 0) && (
                                  <p className="text-xs text-muted-foreground">
                                    {(course.completedHours || 0).toFixed(1)}h / {course.totalHours}h concluídas
                                  </p>
                                )}
                                {course.isFixed && (
                                  <p className="text-xs text-blue-500 font-semibold">
                                    📌 Curso fixo - estuda diariamente
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span>Dia atual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted"></div>
                <span>Dias passados</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>Tempo de estudo</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
