import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Target, Sparkles } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalGoal } from '@/hooks/useGlobalGoal';
import { computeGoalProgress, resolveDailyGoal, type PlanLike } from '@/lib/planningTotals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Meta diária do dia: usa o planejamento ativo de hoje e, na ausência dele,
 * a meta global sincronizada do usuário.
 */
export function DailyGoalCard({
  plans,
  refreshKey,
  className,
}: {
  plans: PlanLike[];
  refreshKey?: number;
  className?: string;
}) {
  const { user } = useAuth();
  const { config, loading: goalLoading } = useGlobalGoal();
  const [studiedMinutes, setStudiedMinutes] = useState(0);
  const [loadingMinutes, setLoadingMinutes] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoadingMinutes(true);

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    supabase
      .from('focus_sessions')
      .select('duration_minutes, session_type')
      .eq('user_id', user.id)
      .gte('completed_at', start.toISOString())
      .then(({ data }) => {
        if (cancelled) return;
        const total = (data ?? [])
          .filter((s) => !s.session_type || s.session_type === 'work')
          .reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0);
        setStudiedMinutes(total);
        setLoadingMinutes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

  const goal = useMemo(
    () => resolveDailyGoal(plans, new Date(), { hoursPerDay: config.hoursPerDay, days: config.days }),
    [plans, config.hoursPerDay, config.days],
  );

  if (goalLoading || loadingMinutes) {
    return (
      <Card className={cn('rounded-2xl', className)}>
        <CardHeader className="pb-2 p-4">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-2 w-full rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (!goal) {
    return (
      <Card className={cn('rounded-2xl', className)}>
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-lg bg-muted p-1">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            Meta diária
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-xs text-muted-foreground">
            Hoje é dia de descanso no seu planejamento. Se quiser estudar mesmo assim, é só iniciar
            uma sessão.
          </p>
        </CardContent>
      </Card>
    );
  }

  const progress = computeGoalProgress(studiedMinutes, goal.hours);
  const remaining = Math.max(0, goal.hours * 60 - studiedMinutes);
  const done = progress >= 100;

  return (
    <Card className={cn('rounded-2xl', className)}>
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-1">
            <Target className="h-3.5 w-3.5 text-primary" />
          </span>
          Meta diária
          <Badge variant="outline" className="ml-auto rounded-full text-[10px] font-normal gap-1">
            <CalendarCheck className="h-3 w-3" />
            {goal.source === 'plan' ? goal.planName || 'Planejamento ativo' : 'Meta global'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="flex items-end justify-between">
          <p className="text-2xl font-bold font-mono tabular-nums">
            {formatHours(studiedMinutes / 60)}
            <span className="text-sm font-normal text-muted-foreground"> / {formatHours(goal.hours)}</span>
          </p>
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              done ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {Math.round(progress)}%
          </span>
        </div>

        <Progress value={progress} className="h-2" />

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          {done ? (
            <>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Meta de hoje concluída. Tudo que vier agora é bônus.
            </>
          ) : (
            <>Faltam {formatHours(remaining / 60)} para bater a meta de hoje.</>
          )}
        </p>

        {(goal.minHours || goal.maxHours) && (
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            {goal.minHours ? (
              <Badge variant="outline" className="rounded-full font-normal">
                Mínimo {formatHours(goal.minHours)}
              </Badge>
            ) : null}
            <Badge variant="outline" className="rounded-full font-normal">
              Ideal {formatHours(goal.hours)}
            </Badge>
            {goal.maxHours ? (
              <Badge variant="outline" className="rounded-full font-normal">
                Máximo {formatHours(goal.maxHours)}
              </Badge>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
