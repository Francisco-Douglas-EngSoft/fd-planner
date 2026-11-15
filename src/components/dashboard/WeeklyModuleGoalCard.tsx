import { useCallback, useEffect, useState } from 'react';
import { Check, Layers, Minus, Pencil, Plus, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useRealtimeFocusSessions } from '@/hooks/useRealtimeFocusSessions';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import {
  countModulesCompletedInWeek,
  resolveWeeklyModuleTarget,
  weekBounds,
  weeklyModuleProgress,
} from '@/lib/weeklyModuleGoal';

type GoalRow = { id: string; week_start: string; target_value: number };

export function WeeklyModuleGoalCard() {
  const { user } = useAuth();
  const { isReadOnly, getDemoData } = useGuestMode();
  const { toast } = useToast();
  const { t, localeTag } = useI18n();
  const refreshKey = useRealtimeFocusSessions(isReadOnly ? undefined : user?.id);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(0);
  const [target, setTarget] = useState(3);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(3);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (isReadOnly) {
      const demo = getDemoData() as unknown as { courseModules?: { is_completed: boolean; completed_at: string | null }[] };
      setCompleted(countModulesCompletedInWeek(demo.courseModules ?? []));
      setTarget(resolveWeeklyModuleTarget([]));
      setLoading(false);
      return;
    }
    if (!user) return;
    const { start, end } = weekBounds();
    const [modsRes, goalsRes] = await Promise.all([
      supabase
        .from('course_modules')
        .select('id, is_completed, completed_at, courses!inner(user_id)')
        .eq('courses.user_id', user.id)
        .eq('is_completed', true)
        .gte('completed_at', start.toISOString())
        .lt('completed_at', end.toISOString()),
      supabase
        .from('weekly_goals')
        .select('id, week_start, target_value')
        .eq('user_id', user.id)
        .eq('goal_type', 'modules')
        .order('week_start', { ascending: false })
        .limit(10),
    ]);
    const rows = (goalsRes.data || []) as GoalRow[];
    setGoals(rows);
    setCompleted(countModulesCompletedInWeek((modsRes.data || []) as never));
    setTarget(resolveWeeklyModuleTarget(rows));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isReadOnly]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const saveTarget = async () => {
    if (!user || isReadOnly) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { startDate, endDate } = weekBounds();
    const value = Math.max(1, Math.min(50, Math.round(draft)));
    const current = goals.find((g) => g.week_start === startDate);
    const payload = {
      target_value: value,
      current_value: completed,
      is_completed: completed >= value,
      updated_at: new Date().toISOString(),
    };
    const { error } = current
      ? await supabase.from('weekly_goals').update(payload).eq('id', current.id)
      : await supabase.from('weekly_goals').insert({
          ...payload,
          user_id: user.id,
          goal_type: 'modules',
          title: t('Módulos concluídos na semana', 'Modules completed this week'),
          week_start: startDate,
          week_end: endDate,
        });
    setSaving(false);
    if (error) {
      toast({ title: t('Não foi possível salvar a meta', 'Could not save the goal'), description: error.message, variant: 'destructive' });
      return;
    }
    setEditing(false);
    toast({ title: t('Meta semanal atualizada', 'Weekly goal updated'), description: t(`${value} módulos por semana.`, `${value} modules per week.`) });
    void load();
  };

  // Mantém o "atual" salvo na meta da semana em dia (usado por outros painéis de metas).
  useEffect(() => {
    if (isReadOnly || !user) return;
    const { startDate } = weekBounds();
    const current = goals.find((g) => g.week_start === startDate);
    if (!current) return;
    void supabase
      .from('weekly_goals')
      .update({ current_value: completed, is_completed: completed >= current.target_value })
      .eq('id', current.id);
  }, [completed, goals, isReadOnly, user]);

  if (loading) return <Skeleton className="h-[132px] w-full rounded-2xl" />;

  const p = weeklyModuleProgress(completed, target);
  const { start } = weekBounds();
  const weekLabel = start.toLocaleDateString(localeTag, { day: '2-digit', month: '2-digit' });

  return (
    <Card className="tint-card overflow-hidden rounded-2xl" style={{ ['--tint' as string]: 'var(--tint-emerald)' }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="tint-icon rounded-xl p-2.5">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('Meta semanal de módulos', 'Weekly module goal')}</p>
              <p className="text-xs text-muted-foreground">
                {t(`Semana desde ${weekLabel} (seg–dom)`, `Week from ${weekLabel} (Mon–Sun)`)}
              </p>
            </div>
          </div>
          {!editing ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 rounded-lg text-xs"
              onClick={() => {
                setDraft(target);
                setEditing(true);
              }}
              disabled={isReadOnly}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t('Ajustar meta', 'Edit goal')}
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setDraft((d) => Math.max(1, d - 1))} aria-label={t('Diminuir', 'Decrease')}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-8 text-center font-mono text-sm font-bold tabular-nums">{draft}</span>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setDraft((d) => Math.min(50, d + 1))} aria-label={t('Aumentar', 'Increase')}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" className="h-8 w-8 rounded-lg" onClick={saveTarget} disabled={saving} aria-label={t('Salvar meta', 'Save goal')}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setEditing(false)} aria-label={t('Cancelar', 'Cancel')}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between">
          <p className="font-display text-3xl font-bold tabular-nums">
            {p.completed}
            <span className="text-base font-medium text-muted-foreground"> / {p.target}</span>
          </p>
          <p className="text-sm font-semibold tabular-nums">{p.percent}%</p>
        </div>
        <Progress value={p.percent} className="mt-2 h-2.5" />
        <p className="mt-2 text-xs text-muted-foreground">
          {p.reached
            ? t('🎉 Meta da semana batida! Continue no ritmo.', '🎉 Weekly goal reached! Keep it up.')
            : t(
                `Faltam ${p.remaining} ${p.remaining === 1 ? 'módulo' : 'módulos'} para bater a meta desta semana.`,
                `${p.remaining} ${p.remaining === 1 ? 'module' : 'modules'} left to reach this week's goal.`,
              )}
        </p>
      </CardContent>
    </Card>
  );
}
