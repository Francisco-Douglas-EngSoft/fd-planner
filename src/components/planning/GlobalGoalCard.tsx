import { useEffect, useMemo, useState } from 'react';
import { fetchCompletedHours } from '@/lib/studyHours';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, format, differenceInCalendarDays, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, CalendarClock, Flag, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'planning:global-goal';

const WEEK_DAYS = [
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
];

interface GoalConfig {
  hoursPerDay: number;
  days: number[];
  startDate: string; // yyyy-MM-dd
}

const defaultConfig = (): GoalConfig => ({
  hoursPerDay: 4,
  days: [1, 2, 3, 4, 5, 6],
  startDate: format(new Date(), 'yyyy-MM-dd'),
});

function loadConfig(): GoalConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    const parsed = JSON.parse(raw) as Partial<GoalConfig>;
    return {
      hoursPerDay: Number(parsed.hoursPerDay) > 0 ? Number(parsed.hoursPerDay) : 4,
      days: Array.isArray(parsed.days) && parsed.days.length > 0 ? parsed.days : [1, 2, 3, 4, 5, 6],
      startDate: parsed.startDate || format(new Date(), 'yyyy-MM-dd'),
    };
  } catch {
    return defaultConfig();
  }
}

interface PlanLike {
  total_hours?: number | null;
  study_plan_courses?: Array<{
    course_id?: string | null;
    courses?: { id?: string; total_hours?: number | null; completed_hours?: number | null } | null;
  }> | null;
}

/**
 * Projeta a data de conclusão a partir de uma data inicial, respeitando
 * apenas os dias da semana selecionados para estudo.
 */
export function projectCompletion(
  remainingHours: number,
  hoursPerDay: number,
  studyDays: number[],
  startDate: Date,
): { endDate: Date | null; studyDaysNeeded: number; calendarDays: number } {
  if (remainingHours <= 0 || hoursPerDay <= 0 || studyDays.length === 0) {
    return { endDate: null, studyDaysNeeded: 0, calendarDays: 0 };
  }

  const studyDaysNeeded = Math.ceil(remainingHours / hoursPerDay);
  const allowed = new Set(studyDays);

  let cursor = startDate;
  let counted = 0;
  // Limite de segurança: ~20 anos de calendário.
  for (let i = 0; i < 7300 && counted < studyDaysNeeded; i++) {
    if (allowed.has(cursor.getDay())) counted++;
    if (counted >= studyDaysNeeded) break;
    cursor = addDays(cursor, 1);
  }

  if (counted < studyDaysNeeded) return { endDate: null, studyDaysNeeded, calendarDays: 0 };

  return {
    endDate: cursor,
    studyDaysNeeded,
    calendarDays: differenceInCalendarDays(cursor, startDate) + 1,
  };
}

export function GlobalGoalCard({ plans }: { plans: PlanLike[] }) {
  const [config, setConfig] = useState<GoalConfig>(loadConfig);
  const [realCompletedHours, setRealCompletedHours] = useState<Record<string, number>>({});
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCompletedHours(user.id).then(h => setRealCompletedHours(h.byCourse)).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const { totalHours, completedHours } = useMemo(() => {
    // Horas totais = soma dos planos; horas concluídas = por curso (sem duplicar
    // cursos que aparecem em mais de um planejamento).
    const total = plans.reduce((sum, p) => sum + (p.total_hours || 0), 0);
    const seen = new Set<string>();
    let completed = 0;
    for (const plan of plans) {
      for (const pc of plan.study_plan_courses ?? []) {
        const id = pc.course_id || pc.courses?.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        completed += (realCompletedHours[id] ?? pc.courses?.completed_hours) || 0;
      }
    }
    return { totalHours: total, completedHours: Math.min(completed, total || completed) };
  }, [plans]);

  const remainingHours = Math.max(0, totalHours - completedHours);
  const progress = totalHours > 0 ? Math.min(100, (completedHours / totalHours) * 100) : 0;

  const parsedStart = parseISO(config.startDate);
  const startDate = isValid(parsedStart) ? parsedStart : new Date();

  const projection = useMemo(
    () => projectCompletion(remainingHours, config.hoursPerDay, config.days, startDate),
    [remainingHours, config.hoursPerDay, config.days, config.startDate],
  );

  const weeklyHours = config.hoursPerDay * config.days.length;

  const toggleDay = (day: number) =>
    setConfig((prev) => {
      const has = prev.days.includes(day);
      const days = has ? prev.days.filter((d) => d !== day) : [...prev.days, day];
      return { ...prev, days: days.length > 0 ? days : prev.days };
    });

  return (
    <Card className="tint-card mt-4" style={{ ['--tint' as string]: 'var(--tint-violet)' }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <span className="tint-icon inline-flex items-center justify-center rounded-lg p-1.5">
            <Target className="h-4 w-4" />
          </span>
          Meta de conclusão de todos os planejamentos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Defina quantas horas estudará por dia e veja automaticamente quando concluirá tudo.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="goal-hours" className="text-xs">Horas por dia</Label>
            <Input
              id="goal-hours"
              type="number"
              min={0.5}
              step={0.5}
              value={config.hoursPerDay}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, hoursPerDay: Math.max(0, Number(e.target.value) || 0) }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-start" className="text-xs">Início dos estudos</Label>
            <Input
              id="goal-start"
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dias de estudo</Label>
            <div className="flex flex-wrap gap-1">
              {WEEK_DAYS.map((d) => (
                <Button
                  key={d.id}
                  type="button"
                  size="sm"
                  variant={config.days.includes(d.id) ? 'default' : 'outline'}
                  className={cn('h-8 px-2 text-[11px]')}
                  onClick={() => toggleDay(d.id)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {Math.round(completedHours)}h concluídas de {Math.round(totalHours)}h
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Flag} label="Horas restantes" value={`${Math.round(remainingHours)}h`} />
          <Stat icon={TrendingUp} label="Ritmo semanal" value={`${weeklyHours.toFixed(1).replace('.0', '')}h/sem`} />
          <Stat
            icon={CalendarClock}
            label="Dias de estudo necessários"
            value={projection.studyDaysNeeded > 0 ? `${projection.studyDaysNeeded}` : '—'}
          />
          <Stat
            icon={Target}
            label="Conclusão prevista"
            value={
              projection.endDate
                ? format(projection.endDate, "dd 'de' MMM 'de' yyyy", { locale: ptBR })
                : remainingHours <= 0
                  ? 'Tudo concluído'
                  : '—'
            }
            highlight
          />
        </div>

        {projection.endDate && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">
              Início em {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
            </Badge>
            <Badge variant="outline">{projection.calendarDays} dias corridos</Badge>
            <Badge variant="outline">
              ≈ {(projection.calendarDays / 30.44).toFixed(1).replace('.', ',')} meses
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium leading-tight">{label}</span>
      </div>
      <p
        className={cn('font-bold', highlight ? 'text-base sm:text-lg' : 'text-lg sm:text-xl')}
        style={highlight ? { color: 'hsl(var(--tint))' } : undefined}
      >
        {value}
      </p>
    </div>
  );
}