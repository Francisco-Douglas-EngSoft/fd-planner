/**
 * CourseScheduleDialog
 * Exibe cronograma profissional e completo de um curso dentro de um planejamento:
 * - Data inicial
 * - 3 ritmos: Mínimo / Ideal / Máximo (horas/dia)
 * - Para cada ritmo: data prevista de conclusão (cenário realista + otimista)
 * - Cronograma por módulo com prazos
 *
 * Mobile: 3 cenários em carousel com swipe horizontal.
 * Desktop: grid de 3 colunas.
 *
 * Cada módulo abre um popover com submódulos, notas e botão "Iniciar Foco".
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  Layers,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  buildCourseSchedule,
  buildModuleSchedule,
  derivePaceConfig,
  formatHoursHMS,
  type ModuleSchedule,
  type PaceLevel,
} from '@/lib/studyPaceCalculator';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { PaceScenarioCard, type PaceScenarioMeta } from './PaceScenarioCard';
import { ModuleDetailsPopover } from './ModuleDetailsPopover';

interface CourseScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
  totalHours: number;
  completedHours: number;
  startDate: string;
  dailyHours: number;
  studyDays: string[];
  minDailyHours?: number | null;
  maxDailyHours?: number | null;
}

// Observação: as chaves `min` / `max` referem-se ao ritmo de estudo (horas/dia),
// mas os rótulos exibidos referem-se à DATA de conclusão:
//  • ritmo mínimo (50%)  → leva MAIS tempo → "Data Máxima"
//  • ritmo máximo (150%) → leva MENOS tempo → "Data Mínima"
const PACE_META: Record<PaceLevel, PaceScenarioMeta> = {
  min: {
    label: 'Mínimo por Dia',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/30',
    icon: Gauge,
    tag: 'Ritmo Mínimo',
  },
  ideal: {
    label: 'Meta Ideal',
    color: 'text-primary',
    bg: 'bg-primary/10',
    ring: 'ring-primary/40',
    icon: Target,
    tag: 'Ritmo Ideal',
  },
  max: {
    label: 'Máximo por Dia',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/30',
    icon: Flame,
    tag: 'Ritmo Máximo',
  },
};

const formatDate = (d: Date | null): string => {
  if (!d) return '—';
  return format(d, "dd 'de' MMM, yyyy", { locale: ptBR });
};

export function CourseScheduleDialog({
  open,
  onOpenChange,
  courseId,
  courseName,
  totalHours,
  completedHours,
  startDate,
  dailyHours,
  studyDays,
  minDailyHours,
  maxDailyHours,
}: CourseScheduleDialogProps) {
  const [modules, setModules] = useState<
    Array<{ id: string; name: string; hours: number; is_completed: boolean; sequence_order: number }>
  >([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const isMobile = useIsMobile();

  // Carousel state
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [currentSlide, setCurrentSlide] = useState(1); // ideal por padrão

  useEffect(() => {
    if (!carouselApi) return;
    // Inicia no slide "ideal" (índice 1)
    carouselApi.scrollTo(1, true);
    const onSelect = () => setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    onSelect();
    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!open || !courseId) return;
    let cancelled = false;
    (async () => {
      setLoadingModules(true);
      const { data } = await supabase
        .from('course_modules')
        .select('id, name, hours, is_completed, sequence_order, order_index')
        .eq('course_id', courseId)
        .order('sequence_order', { ascending: true })
        .order('order_index', { ascending: true });
      if (!cancelled) {
        setModules((data || []).map((m) => ({
          id: m.id,
          name: m.name,
          hours: m.hours || 0,
          is_completed: m.is_completed,
          sequence_order: m.sequence_order || 0,
        })));
        setLoadingModules(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, courseId]);

  const paceConfig = useMemo(
    () => derivePaceConfig(dailyHours, { min: minDailyHours, max: maxDailyHours }),
    [dailyHours, minDailyHours, maxDailyHours],
  );

  // "Hoje" reativo: reseta sempre que o diálogo abre e atualiza a cada minuto
  // garantindo que as projeções (Cenários de Conclusão) recalculem sem reload.
  const [today, setToday] = useState<Date>(() => new Date());
  useEffect(() => {
    if (!open) return;
    setToday(new Date());
    const id = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, [open]);

  const courseSchedule = useMemo(
    () =>
      buildCourseSchedule({
        startDate,
        totalHours,
        completedHours,
        paceConfig,
        studyDays,
        today,
      }),
    [startDate, totalHours, completedHours, paceConfig, studyDays, today],
  );

  const moduleSchedule: ModuleSchedule[] = useMemo(() => {
    if (modules.length === 0) return [];
    return buildModuleSchedule({
      startDate,
      modules: modules.map((m) => ({
        id: m.id,
        name: m.name,
        hours: m.hours,
        isCompleted: m.is_completed,
      })),
      paceConfig,
      studyDays,
    });
  }, [modules, startDate, paceConfig, studyDays]);

  const progress =
    totalHours > 0 ? Math.min(100, Math.round((completedHours / totalHours) * 100)) : 0;

  const paceLevels: PaceLevel[] = ['min', 'ideal', 'max'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[95vw] md:!max-w-[70vw] md:w-[70vw] max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b bg-gradient-to-br from-primary/10 via-background to-accent/5 text-left">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/15 ring-1 ring-primary/20 shrink-0">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-xl font-bold leading-tight break-words pr-6">
                {courseName}
              </DialogTitle>
              <DialogDescription className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs">
                <Badge variant="outline" className="gap-1 px-1.5 py-0 h-5">
                  <Calendar className="h-3 w-3" />
                  <span className="hidden sm:inline">Início:</span> {formatDate(courseSchedule.startDate)}
                </Badge>
                <Badge variant="outline" className="gap-1 px-1.5 py-0 h-5">
                  <Clock className="h-3 w-3" />
                  {formatHoursHMS(totalHours)}
                </Badge>
                <Badge variant="outline" className="gap-1 px-1.5 py-0 h-5 bg-primary/5">
                  <Zap className="h-3 w-3" />
                  {formatHoursHMS(dailyHours)}/dia
                </Badge>
              </DialogDescription>
            </div>
          </div>

          {/* Progresso global */}
          <div className="mt-3 sm:mt-4 p-3 rounded-lg bg-background/60 backdrop-blur border">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium">Progresso geral</span>
              <span className="font-mono font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between mt-2 text-[10px] sm:text-[11px] text-muted-foreground font-mono gap-2">
              <span className="truncate">{formatHoursHMS(completedHours)} feitas</span>
              <span className="truncate text-right">
                {formatHoursHMS(courseSchedule.remainingHours)} restantes
              </span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {/* 3 Ritmos */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wider">
                  Cenários de Conclusão
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Mostra a data prevista para concluir o curso em cada ritmo de estudo, comparando
                o cenário <strong>realista</strong> (apenas dias de estudo selecionados) e o{' '}
                <strong>otimista</strong> (estudando todos os dias).
                {isMobile && (
                  <span className="block mt-1 text-primary/80 italic">
                    Deslize para ver os outros cenários →
                  </span>
                )}
              </p>

              {isMobile ? (
                <>
                  <Carousel
                    setApi={setCarouselApi}
                    opts={{ align: 'center', loop: false, startIndex: 1 }}
                    className="w-full"
                  >
                    <CarouselContent className="-ml-2">
                      {paceLevels.map((level, i) => (
                        <CarouselItem key={level} className="pl-2 basis-[88%]">
                          <PaceScenarioCard
                            level={level}
                            meta={PACE_META[level]}
                            projection={courseSchedule.projections[level]}
                            index={i}
                          />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>

                  {/* Dots indicator */}
                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    {paceLevels.map((level, i) => (
                      <button
                        key={level}
                        type="button"
                        aria-label={`Ir para ${PACE_META[level].label}`}
                        onClick={() => carouselApi?.scrollTo(i)}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          currentSlide === i
                            ? cn('w-6', PACE_META[level].color.replace('text-', 'bg-'))
                            : 'w-1.5 bg-muted-foreground/30',
                        )}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {paceLevels.map((level, i) => (
                    <PaceScenarioCard
                      key={level}
                      level={level}
                      meta={PACE_META[level]}
                      projection={courseSchedule.projections[level]}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Cronograma por módulo */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wider">
                  Cronograma por Módulo
                </h3>
                {modules.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {modules.length} módulo{modules.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {loadingModules && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Carregando módulos...
                </div>
              )}

              {!loadingModules && moduleSchedule.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <Layers className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      Este curso ainda não possui módulos cadastrados.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Adicione módulos na página de Cursos para visualizar o cronograma detalhado.
                    </p>
                  </CardContent>
                </Card>
              )}

              {!loadingModules && moduleSchedule.length > 0 && (
                <div className="space-y-2">
                  {moduleSchedule.map((mod, idx) => (
                    <ModuleDetailsPopover
                      key={mod.id}
                      moduleId={mod.id}
                      moduleName={mod.name}
                      moduleHours={mod.hours}
                      isCompleted={mod.isCompleted}
                      courseId={courseId}
                      onClosePlanDialog={() => onOpenChange(false)}
                    >
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border transition-all cursor-pointer',
                          'hover:shadow-sm hover:border-primary/40 active:scale-[0.99]',
                          'focus:outline-none focus:ring-2 focus:ring-primary/40',
                          mod.isCompleted
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-card hover:bg-muted/40 border-border/60',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0',
                              mod.isCompleted
                                ? 'bg-emerald-500/20 text-emerald-500'
                                : 'bg-primary/15 text-primary',
                            )}
                          >
                            {mod.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                              <p
                                className={cn(
                                  'text-sm font-medium truncate',
                                  mod.isCompleted && 'line-through text-muted-foreground',
                                )}
                              >
                                {mod.name}
                              </p>
                              <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                {formatHoursHMS(mod.hours)}
                              </Badge>
                            </div>

                            {!mod.isCompleted && (
                              <div className="grid grid-cols-3 gap-1.5 mt-2">
                                {paceLevels.map((level) => {
                                  const meta = PACE_META[level];
                                  return (
                                    <div
                                      key={level}
                                      className={cn('p-1.5 rounded text-center min-w-0', meta.bg)}
                                    >
                                      <p
                                        className={cn(
                                          'text-[9px] uppercase font-semibold truncate',
                                          meta.color,
                                        )}
                                      >
                                        {meta.label}
                                      </p>
                                      <p className="text-[10px] font-mono mt-0.5 truncate">
                                        {mod.endDates[level]
                                          ? format(mod.endDates[level]!, 'dd/MM/yy', {
                                              locale: ptBR,
                                            })
                                          : '—'}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {mod.isCompleted && (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                                Concluído
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    </ModuleDetailsPopover>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
