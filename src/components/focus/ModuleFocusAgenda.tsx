import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock,
  CheckCircle2,
  Layers,
  Loader2,
  PlayCircle,
  RefreshCcw,
  Sunrise,
  Sun,
  Moon,
  Flag,
  Zap,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PLAN_MODULES_SELECT } from '@/lib/modulePlanAdapter';
import { completeCourseModule, enrichPlanModules } from '@/lib/modulePlanData';
import {
  buildFocusModuleAgenda,
  splitStudiedMinutes,
  suggestedSessionMinutes,
  type FocusAgendaPlan,
  type FocusModuleItem,
} from '@/lib/focusModuleAgenda';
import { formatMinutesShort } from '@/lib/moduleSchedule';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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

export interface StartModuleSessionArgs {
  courseId: string;
  moduleId: string | null;
  minutes: number;
  moduleName: string;
  courseName: string;
}

interface ModuleFocusAgendaProps {
  onStartSession: (args: StartModuleSessionArgs) => void;
  /** Módulo vinculado ao timer agora. */
  activeModuleId?: string;
  isRunning?: boolean;
  refreshKey?: number;
  /** Quantos módulos ainda têm meta para hoje (para o selo da aba). */
  onPendingCountChange?: (count: number) => void;
  className?: string;
}

const SLOT_META = {
  morning: { label: 'Manhã', icon: Sunrise },
  afternoon: { label: 'Tarde', icon: Sun },
  evening: { label: 'Noite', icon: Moon },
} as const;

export function ModuleFocusAgenda({
  onStartSession,
  activeModuleId,
  isRunning,
  refreshKey,
  onPendingCountChange,
  className,
}: ModuleFocusAgendaProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<FocusAgendaPlan[]>([]);
  const [sessions, setSessions] = useState<{ module_id: string | null; duration_minutes: number | null; completed_at: string }[]>([]);
  const [confirmItem, setConfirmItem] = useState<FocusModuleItem | null>(null);
  const [completing, setCompleting] = useState(false);
  // Recalcula a virada do dia sem recarregar a página.
  const [dayKey, setDayKey] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select(`id, name, planning_type, start_date, end_date, daily_hours, study_days, no_deadline, ${PLAN_MODULES_SELECT}`)
        .eq('user_id', user.id)
        .eq('planning_type', 'module');
      if (error) throw error;
      let list = (data || []) as unknown as FocusAgendaPlan[];
      try {
        list = await enrichPlanModules(list);
      } catch {
        // Continua com os dados salvos no plano.
      }
      setPlans(list);

      const moduleIds = Array.from(
        new Set(list.flatMap((p) => (p.study_plan_modules || []).map((r) => r.module_id).filter(Boolean))),
      ) as string[];
      if (moduleIds.length) {
        const { data: s } = await supabase
          .from('focus_sessions')
          .select('module_id, duration_minutes, completed_at')
          .eq('user_id', user.id)
          .eq('session_type', 'work')
          .in('module_id', moduleIds);
        setSessions((s || []) as typeof sessions);
      } else {
        setSessions([]);
      }
    } catch {
      setPlans([]);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey, dayKey]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const k = format(new Date(), 'yyyy-MM-dd');
      setDayKey((prev) => (prev === k ? prev : k));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const agenda = useMemo(() => {
    const now = new Date();
    return buildFocusModuleAgenda(plans, splitStudiedMinutes(sessions, now), now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, sessions, dayKey]);

  const pendingCount = agenda.items.filter((i) => !i.todayDone).length;
  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [pendingCount, onPendingCountChange]);

  const nextUp = useMemo(
    () => agenda.items.find((i) => !i.todayDone && i.courseId) ?? null,
    [agenda.items],
  );

  const start = (item: FocusModuleItem) => {
    if (!item.courseId) return;
    onStartSession({
      courseId: item.courseId,
      moduleId: item.moduleId,
      minutes: suggestedSessionMinutes(item),
      moduleName: item.moduleName,
      courseName: item.courseName,
    });
  };

  const handleComplete = async () => {
    if (!confirmItem?.moduleId) return;
    setCompleting(true);
    try {
      await completeCourseModule(confirmItem.moduleId);
      toast({ title: 'Módulo concluído!', description: `${confirmItem.moduleName} foi marcado como concluído.` });
      setConfirmItem(null);
      await fetchData();
    } catch (e) {
      toast({
        title: 'Não foi possível concluir o módulo',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setCompleting(false);
    }
  };

  if (loading && plans.length === 0) {
    return (
      <Card className={cn('rounded-2xl', className)}>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Sem planos "Por Módulo" em andamento: não ocupa espaço na aba.
  if (agenda.activePlans === 0 && agenda.awaitingCompletion.length === 0) return null;

  const dayPct = agenda.plannedTodayMinutes > 0
    ? Math.min(100, Math.round((agenda.studiedTodayMinutes / agenda.plannedTodayMinutes) * 100))
    : 0;
  const allDoneToday = agenda.items.length > 0 && pendingCount === 0;

  return (
    <Card className={cn('rounded-2xl overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Módulos de hoje
          </CardTitle>
          <div className="flex items-center gap-2">
            {agenda.plannedTodayMinutes > 0 && (
              <Badge variant="secondary" className="text-xs tabular-nums">
                {formatMinutesShort(agenda.studiedTodayMinutes)} / {formatMinutesShort(agenda.plannedTodayMinutes)}
              </Badge>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={fetchData}
              disabled={loading}
              aria-label="Atualizar módulos de hoje"
            >
              <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
        {agenda.plannedTodayMinutes > 0 && (
          <div className="pt-2 space-y-1">
            <Progress value={dayPct} className={cn('h-2', allDoneToday && '[&>div]:bg-success')} />
            <p className="text-[11px] text-muted-foreground">
              {allDoneToday
                ? 'Meta dos módulos de hoje concluída. Sessões extras adiantam o plano.'
                : `${dayPct}% do planejado para hoje · ${pendingCount} ${pendingCount === 1 ? 'módulo pendente' : 'módulos pendentes'}`}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Próximo a estudar */}
        {nextUp && !(isRunning && activeModuleId && activeModuleId === nextUp.moduleId) && (
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 text-primary text-xs font-medium mb-1.5">
              <PlayCircle className="h-3.5 w-3.5" />
              Próximo módulo
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{nextUp.moduleName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {nextUp.courseName} · faltam {formatMinutesShort(nextUp.remainingTodayMinutes)} hoje
                </p>
              </div>
              <Button size="sm" onClick={() => start(nextUp)} className="shrink-0">
                Começar
              </Button>
            </div>
          </div>
        )}

        {agenda.items.length === 0 && (
          <div className="rounded-xl border bg-muted/20 p-4 text-center space-y-1">
            <CalendarClock className="h-7 w-7 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">Nenhum módulo planejado para hoje</p>
            {agenda.next[0] ? (
              <p className="text-xs text-muted-foreground">
                Próximo: {format(parseISO(agenda.next[0].date), "EEEE, dd/MM", { locale: ptBR })} —{' '}
                {agenda.next[0].moduleName} ({formatMinutesShort(agenda.next[0].minutes)})
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Ajuste os dias de estudo no Planejamento.</p>
            )}
          </div>
        )}

        <ul className="space-y-2">
          {agenda.items.map((item) => (
            <ModuleRow
              key={item.key}
              item={item}
              isActive={Boolean(activeModuleId) && activeModuleId === item.moduleId}
              isRunning={Boolean(isRunning)}
              onStart={() => start(item)}
              onComplete={() => setConfirmItem(item)}
            />
          ))}
        </ul>

        {agenda.awaitingCompletion.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5" />
              Horas cumpridas — falta concluir
            </p>
            <ul className="space-y-2">
              {agenda.awaitingCompletion.map((item) => (
                <ModuleRow
                  key={item.key}
                  item={item}
                  compact
                  isActive={Boolean(activeModuleId) && activeModuleId === item.moduleId}
                  isRunning={Boolean(isRunning)}
                  onStart={() => start(item)}
                  onComplete={() => setConfirmItem(item)}
                />
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <AlertDialog open={Boolean(confirmItem)} onOpenChange={(o) => !o && !completing && setConfirmItem(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir módulo?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmItem?.moduleName}</strong> ({confirmItem?.courseName}) será marcado como concluído no
              curso e nos planejamentos. O próximo módulo entra na sua agenda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleComplete();
              }}
              disabled={completing}
            >
              {completing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Concluir módulo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ModuleRow({
  item,
  isActive,
  isRunning,
  compact,
  onStart,
  onComplete,
}: {
  item: FocusModuleItem;
  isActive: boolean;
  isRunning: boolean;
  compact?: boolean;
  onStart: () => void;
  onComplete: () => void;
}) {
  const slot = item.timeSlot ? SLOT_META[item.timeSlot] : null;
  const SlotIcon = slot?.icon;
  const inFocus = isActive && isRunning;
  const todayPct = item.plannedMinutes > 0
    ? Math.min(100, Math.round((item.studiedTodayMinutes / item.plannedMinutes) * 100))
    : 0;
  const startLabel = inFocus
    ? 'Em foco'
    : item.remainingTodayMinutes > 0
      ? `${item.studiedTodayMinutes > 0 ? 'Continuar' : 'Iniciar'} ${formatMinutesShort(suggestedSessionMinutes(item))}`
      : `Extra ${formatMinutesShort(suggestedSessionMinutes(item))}`;

  return (
    <li
      className={cn(
        'rounded-xl border p-3 transition-colors',
        inFocus && 'border-primary/50 bg-primary/5 ring-1 ring-primary/30',
        !inFocus && item.todayDone && 'border-success/40 bg-success/5',
        !inFocus && !item.todayDone && 'bg-card',
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.todayDone ? (
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          ) : inFocus ? (
            <Zap className="h-4 w-4 text-primary shrink-0" />
          ) : null}
          <p className="font-medium text-sm leading-snug">{item.moduleName}</p>
          {inFocus && <Badge className="text-[10px] px-1.5 py-0 h-4">Em foco agora</Badge>}
          {isActive && !isRunning && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">No timer</Badge>
          )}
          {item.todayDone && !inFocus && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-success/40 text-success">Meta de hoje feita</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {item.courseName}
          {slot && SlotIcon && (
            <span className="inline-flex items-center gap-0.5 ml-1.5 align-middle">
              · <SlotIcon className="h-3 w-3" /> {slot.label}
            </span>
          )}
          <span className="text-muted-foreground/70"> · {item.planName}</span>
        </p>
      </div>

      {!compact && item.plannedMinutes > 0 && (
        <div className="mt-3 space-y-1">
          <Progress value={todayPct} className={cn('h-1.5', item.todayDone && '[&>div]:bg-success')} />
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>Hoje {formatMinutesShort(item.studiedTodayMinutes)} de {formatMinutesShort(item.plannedMinutes)}</span>
            <span>{todayPct}%</span>
          </div>
        </div>
      )}

      {item.moduleMinutes > 0 && (
        <div className="mt-2 space-y-1">
          <Progress value={item.moduleProgressPct} className="h-1 bg-muted [&>div]:bg-primary/50" />
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>
              Módulo {formatMinutesShort(item.studiedTotalMinutes)} de {formatMinutesShort(item.moduleMinutes)}
            </span>
            <span>{item.moduleProgressPct}%</span>
          </div>
        </div>
      )}

      {!item.moduleId && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Este módulo não está ligado ao curso; as sessões contam só para o curso.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        {item.moduleId && (item.readyToComplete || compact) ? (
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-success hover:text-success" onClick={onComplete}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Concluir módulo
          </Button>
        ) : (
          <span />
        )}
        {inFocus ? (
          <span className="text-xs font-medium text-primary flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" /> Sessão em andamento
          </span>
        ) : (
          <Button
            size="sm"
            variant={item.todayDone ? 'outline' : 'default'}
            className="h-8 gap-1.5"
            onClick={onStart}
            disabled={!item.courseId}
            aria-label={`${startLabel}: ${item.moduleName}`}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            {startLabel}
          </Button>
        )}
      </div>
    </li>
  );
}
