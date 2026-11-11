import { useMemo } from 'react';
import { CalendarDays, ListOrdered, RotateCcw, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  suggestLaneDays,
  WEEK_ORDER,
  WEEKDAY_LABELS,
  type LaneSetting,
  type ModulePlanMode,
  type ScheduleModule,
  type ScheduleOptions,
  type TimeSlotId,
} from '@/lib/moduleSchedule';
import { ModuleScheduleView, TIME_SLOT_META, useCourseTints } from './ModuleScheduleView';

interface ModuleWeeklyPlannerProps {
  modules: ScheduleModule[];
  mode: ModulePlanMode;
  onModeChange: (mode: ModulePlanMode) => void;
  lanes: Record<string, LaneSetting>;
  onLanesChange: (lanes: Record<string, LaneSetting>) => void;
  studyDays: string[];
  dailyHours: number;
  startDate: Date;
  deadline: string | null;
}

export function ModuleWeeklyPlanner({
  modules,
  mode,
  onModeChange,
  lanes,
  onLanesChange,
  studyDays,
  dailyHours,
  startDate,
  deadline,
}: ModuleWeeklyPlannerProps) {
  const tints = useCourseTints(modules);

  const courses = useMemo(() => {
    const map = new Map<string, { courseId: string; courseName: string; hours: number; count: number; firstOrder: number }>();
    for (const m of modules) {
      const c = map.get(m.courseId) ?? { courseId: m.courseId, courseName: m.courseName, hours: 0, count: 0, firstOrder: m.order };
      c.hours += m.hours;
      c.count += 1;
      c.firstOrder = Math.min(c.firstOrder, m.order);
      map.set(m.courseId, c);
    }
    return Array.from(map.values()).sort((a, b) => a.firstOrder - b.firstOrder);
  }, [modules]);

  const options: ScheduleOptions = useMemo(
    () => ({ startDate, studyDays, dailyHours, mode, lanes }),
    [startDate, studyDays, dailyHours, mode, lanes],
  );

  const daysOf = (courseId: string) => {
    const d = lanes[courseId]?.days;
    return d === undefined ? studyDays : d.filter((x) => studyDays.includes(x));
  };

  const updateLane = (courseId: string, patch: Partial<LaneSetting>) => {
    onLanesChange({ ...lanes, [courseId]: { ...lanes[courseId], ...patch } });
  };

  const toggleDay = (courseId: string, day: string) => {
    const current = daysOf(courseId);
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    updateLane(courseId, { days: next });
  };

  const applySuggestion = () => {
    const suggestion = suggestLaneDays(
      courses.map((c) => ({ courseId: c.courseId, hours: c.hours })),
      studyDays,
    );
    const next = { ...lanes };
    for (const c of courses) next[c.courseId] = { ...next[c.courseId], days: suggestion[c.courseId] };
    onLanesChange(next);
  };

  const resetAllDays = () => {
    const next = { ...lanes };
    for (const c of courses) next[c.courseId] = { ...next[c.courseId], days: undefined };
    onLanesChange(next);
  };

  return (
    <div className="space-y-5">
      {/* Como distribuir */}
      <div className="grid sm:grid-cols-2 gap-2.5">
        <ModeCard
          active={mode === 'weekly'}
          onClick={() => onModeChange('weekly')}
          icon={CalendarDays}
          title="Por dias da semana"
          text="Cada curso tem seus dias. Os módulos de um curso seguem em ordem nesses dias."
        />
        <ModeCard
          active={mode === 'sequence'}
          onClick={() => onModeChange('sequence')}
          icon={ListOrdered}
          title="Em sequência"
          text="Um módulo por vez, na ordem de execução, usando toda a meta do dia."
        />
      </div>

      {mode === 'weekly' && courses.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Dias de cada curso</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={resetAllDays}>
                <RotateCcw className="h-3.5 w-3.5" />
                Todos os dias
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={applySuggestion}>
                <Wand2 className="h-3.5 w-3.5" />
                Distribuir automaticamente
              </Button>
            </div>
          </div>

          <div className="rounded-xl border divide-y">
            {courses.map((c) => {
              const days = daysOf(c.courseId);
              const lane = lanes[c.courseId] ?? {};
              return (
                <div key={c.courseId} className="p-3 space-y-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: `hsl(${tints[c.courseId]})` }} />
                    <p className="text-sm font-medium truncate flex-1">{c.courseName}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {c.count} módulo{c.count === 1 ? '' : 's'} · {Math.round(c.hours * 10) / 10}h
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {WEEK_ORDER.map((d) => {
                      const enabled = studyDays.includes(d);
                      const on = enabled && days.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={!enabled}
                          onClick={() => toggleDay(c.courseId, d)}
                          aria-pressed={on}
                          title={enabled ? WEEKDAY_LABELS[d].long : `${WEEKDAY_LABELS[d].long} não é dia de estudo do plano`}
                          className={cn(
                            'h-8 min-w-[42px] px-2 rounded-md text-xs font-semibold border transition-colors',
                            on
                              ? 'bg-primary text-primary-foreground border-primary'
                              : enabled
                                ? 'bg-background text-muted-foreground hover:border-primary/50'
                                : 'bg-muted/40 text-muted-foreground/40 border-dashed cursor-not-allowed',
                          )}
                        >
                          {WEEKDAY_LABELS[d].short}
                        </button>
                      );
                    })}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Input
                        type="number"
                        min={0}
                        max={12}
                        step={0.25}
                        inputMode="decimal"
                        value={lane.sessionHours ?? ''}
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          updateLane(c.courseId, { sessionHours: Number.isFinite(v) && v > 0 ? v : null });
                        }}
                        placeholder="Auto"
                        aria-label={`Horas por sessão de ${c.courseName}`}
                        title="Horas por sessão (vazio = divide a meta do dia)"
                        className="h-8 md:h-8 w-[76px] text-xs"
                      />
                      <Select
                        value={lane.timeSlot ?? 'any'}
                        onValueChange={(v) => updateLane(c.courseId, { timeSlot: v === 'any' ? null : (v as TimeSlotId) })}
                      >
                        <SelectTrigger className="h-8 w-[132px] text-xs" aria-label={`Período de ${c.courseName}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Qualquer hora</SelectItem>
                          {(Object.keys(TIME_SLOT_META) as TimeSlotId[]).map((k) => (
                            <SelectItem key={k} value={k}>
                              {TIME_SLOT_META[k].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {days.length === 0 && (
                    <p className="text-[11px] text-destructive">Escolha ao menos um dia para este curso.</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Horas por sessão vazias dividem a meta do dia igualmente entre os cursos daquele dia.
          </p>
        </div>
      )}

      <ModuleScheduleView modules={modules} options={options} deadline={deadline} />
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon: Icon,
  title,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof CalendarDays;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors',
        active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
      )}
    >
      <span className={cn('rounded-lg p-2 shrink-0', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="space-y-0.5">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}
