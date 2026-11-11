import { useMemo } from 'react';
import { addDays, differenceInCalendarDays, differenceInCalendarWeeks, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, CalendarCheck, CalendarRange, CheckCircle2, Clock, Layers, Moon, Sun, Sunrise } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  buildModuleSchedule,
  buildWeeklyTemplate,
  formatMinutesShort,
  WEEK_ORDER,
  WEEKDAY_LABELS,
  type ScheduleModule,
  type ScheduleOptions,
  type TimeSlotId,
} from '@/lib/moduleSchedule';

const TINTS = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan', 'orange', 'teal', 'indigo', 'pink'];

/** Cor estável por curso, a partir da ordem em que os cursos aparecem. */
export function useCourseTints(modules: ScheduleModule[]) {
  return useMemo(() => {
    const map: Record<string, string> = {};
    let i = 0;
    for (const m of [...modules].sort((a, b) => a.order - b.order)) {
      if (!(m.courseId in map)) map[m.courseId] = `var(--tint-${TINTS[i++ % TINTS.length]})`;
    }
    map.sequence = 'var(--primary)';
    return map;
  }, [modules]);
}

export const TIME_SLOT_META: Record<TimeSlotId, { label: string; icon: typeof Sun }> = {
  morning: { label: 'Manhã', icon: Sunrise },
  afternoon: { label: 'Tarde', icon: Sun },
  evening: { label: 'Noite', icon: Moon },
};

const fmtDate = (iso: string, pattern = "dd 'de' MMM") => format(parseISO(iso), pattern, { locale: ptBR });

interface ModuleScheduleViewProps {
  modules: ScheduleModule[];
  options: ScheduleOptions;
  /** Prazo final do plano (yyyy-MM-dd) para comparar com a conclusão prevista. */
  deadline?: string | null;
  className?: string;
}

export function ModuleScheduleView({ modules, options, deadline, className }: ModuleScheduleViewProps) {
  const tints = useCourseTints(modules);
  const schedule = useMemo(() => buildModuleSchedule(modules, options), [modules, options]);
  const template = useMemo(() => {
    if (options.mode !== 'sequence') return buildWeeklyTemplate(modules, options);
    // Em sequência: mostra os módulos reais da primeira semana.
    const byId = new Map(modules.map((m) => [m.id, m]));
    const out = Object.fromEntries(WEEK_ORDER.map((d) => [d, [] as ReturnType<typeof buildWeeklyTemplate>[typeof d]])) as ReturnType<typeof buildWeeklyTemplate>;
    const firstWeekEnd = format(addDays(options.startDate, 6), 'yyyy-MM-dd');
    for (const day of schedule.days) {
      if (day.date > firstWeekEnd) break;
      for (const it of day.items) {
        const m = byId.get(it.moduleId);
        out[day.dayId].push({
          laneId: it.moduleId,
          courseId: m?.courseId ?? 'sequence',
          courseName: m?.name ?? 'Módulo',
          minutes: it.minutes,
          isFixed: false,
          timeSlot: null,
        });
      }
    }
    return out;
  }, [modules, options, schedule]);

  const budget = Math.max(0, options.dailyHours) * 60;
  const weeklyMinutes = WEEK_ORDER.reduce(
    (s, d) => s + template[d].reduce((a, e) => a + e.minutes, 0),
    0,
  );
  const totalHours = modules.filter((m) => !m.done).reduce((s, m) => s + m.hours, 0);
  const finish = schedule.finishDate;
  const lateDays = finish && deadline ? differenceInCalendarDays(parseISO(finish), parseISO(deadline)) : 0;
  const weeks = finish ? differenceInCalendarWeeks(parseISO(finish), options.startDate, { weekStartsOn: 1 }) + 1 : null;
  const overBudgetDays = WEEK_ORDER.filter(
    (d) => template[d].reduce((a, e) => a + e.minutes, 0) > budget + 0.5,
  );

  const timeline = useMemo(
    () =>
      [...modules]
        .filter((m) => !m.done)
        .sort((a, b) => {
          const pa = schedule.projections[a.id]?.start ?? '9999';
          const pb = schedule.projections[b.id]?.start ?? '9999';
          return pa === pb ? a.order - b.order : pa.localeCompare(pb);
        }),
    [modules, schedule],
  );

  if (modules.length === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground', className)}>
        Selecione módulos para ver a grade da semana e o cronograma.
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Kpi
          icon={CalendarCheck}
          label="Conclusão prevista"
          value={finish ? fmtDate(finish, 'dd/MM/yyyy') : '—'}
          hint={
            !finish
              ? 'Defina dias para todos os cursos'
              : deadline
                ? lateDays > 0
                  ? `${lateDays} dia${lateDays === 1 ? '' : 's'} após o prazo`
                  : 'Dentro do prazo'
                : weeks
                  ? `em ${weeks} semana${weeks === 1 ? '' : 's'}`
                  : undefined
          }
          tone={!finish ? 'muted' : deadline && lateDays > 0 ? 'danger' : 'success'}
        />
        <Kpi icon={Clock} label="Carga semanal" value={formatMinutesShort(weeklyMinutes)} hint={`meta de ${formatMinutesShort(budget)}/dia`} />
        <Kpi icon={Layers} label="Módulos" value={String(timeline.length)} hint={`${Math.round(totalHours * 10) / 10}h no total`} />
        <Kpi
          icon={CalendarRange}
          label="Dias de estudo"
          value={String(schedule.days.length)}
          hint={weeks ? `${weeks} semana${weeks === 1 ? '' : 's'}` : undefined}
        />
      </div>

      {/* Grade da semana */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">{options.mode === 'sequence' ? 'Primeira semana' : 'Grade da semana'}</h4>
          <span className="text-xs text-muted-foreground">
            {options.mode === 'sequence' ? 'módulos estudados em cada dia' : 'tempo de cada curso por dia'}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_ORDER.map((day) => {
            const entries = template[day];
            const isStudyDay = options.studyDays.includes(day);
            const dayTotal = entries.reduce((a, e) => a + e.minutes, 0);
            const over = dayTotal > budget + 0.5;
            return (
              <div
                key={day}
                className={cn(
                  'rounded-lg border p-1.5 min-h-[112px] flex flex-col gap-1',
                  isStudyDay ? 'bg-card' : 'bg-muted/30 border-dashed',
                  over && 'border-destructive/50',
                )}
              >
                <div className="text-center">
                  <p className={cn('text-[11px] font-semibold uppercase tracking-wide', isStudyDay ? 'text-foreground' : 'text-muted-foreground')}>
                    {WEEKDAY_LABELS[day].short}
                  </p>
                  <p className={cn('text-[10px]', over ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                    {isStudyDay ? (dayTotal > 0 ? formatMinutesShort(dayTotal) : 'livre') : 'folga'}
                  </p>
                </div>
                {entries.map((e) => {
                  const Slot = e.timeSlot ? TIME_SLOT_META[e.timeSlot].icon : null;
                  return (
                    <div
                      key={e.laneId}
                      className="rounded-md px-1.5 py-1 text-[10px] leading-tight border"
                      style={{
                        backgroundColor: `hsl(${tints[e.courseId]} / 0.14)`,
                        borderColor: `hsl(${tints[e.courseId]} / 0.45)`,
                      }}
                      title={`${e.courseName} · ${formatMinutesShort(e.minutes)}${e.timeSlot ? ` · ${TIME_SLOT_META[e.timeSlot].label}` : ''}`}
                    >
                      <p className="font-semibold truncate text-foreground">{e.courseName}</p>
                      <p className="flex items-center gap-0.5 text-muted-foreground">
                        {Slot && <Slot className="h-2.5 w-2.5" />}
                        {formatMinutesShort(e.minutes)}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {(overBudgetDays.length > 0 || schedule.unscheduledModuleIds.length > 0) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1 text-xs">
          {overBudgetDays.length > 0 && (
            <p className="flex items-start gap-1.5 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Os tempos fixos passam da meta diária em: {overBudgetDays.map((d) => WEEKDAY_LABELS[d].long).join(', ')}.
            </p>
          )}
          {schedule.unscheduledModuleIds.length > 0 && (
            <p className="flex items-start gap-1.5 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {schedule.unscheduledModuleIds.length} módulo(s) ficam sem horário — escolha ao menos um dia para cada curso.
            </p>
          )}
        </div>
      )}

      {/* Cronograma */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Cronograma dos módulos</h4>
          <span className="text-xs text-muted-foreground">início → fim previstos</span>
        </div>
        <div className="rounded-lg border divide-y max-h-[320px] overflow-y-auto">
          {timeline.map((m, idx) => {
            const p = schedule.projections[m.id];
            const late = Boolean(p?.end && deadline && p.end > deadline);
            return (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2">
                <span
                  className="h-7 w-1 rounded-full shrink-0"
                  style={{ backgroundColor: `hsl(${tints[m.courseId] ?? 'var(--primary)'})` }}
                />
                <span className="text-[10px] font-mono text-muted-foreground w-5 text-right">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {m.courseName} · {m.hours}h{p?.sessions ? ` · ${p.sessions} ${p.sessions === 1 ? 'sessão' : 'sessões'}` : ''}
                  </p>
                </div>
                {p?.start && p.end ? (
                  <div className="text-right shrink-0">
                    <p className={cn('text-xs font-medium', late ? 'text-destructive' : 'text-foreground')}>
                      {p.start === p.end ? fmtDate(p.start) : `${fmtDate(p.start)} → ${fmtDate(p.end)}`}
                    </p>
                    {late && <p className="text-[10px] text-destructive">após o prazo</p>}
                  </div>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">
                    sem dia definido
                  </Badge>
                )}
              </div>
            );
          })}
          {modules.some((m) => m.done) && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              {modules.filter((m) => m.done).length} módulo(s) já concluído(s)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'success' | 'danger' | 'muted';
}) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="text-base font-bold mt-0.5">{value}</p>
      {hint && (
        <p
          className={cn(
            'text-[10px]',
            tone === 'success' && 'text-success',
            tone === 'danger' && 'text-destructive',
            (tone === 'default' || tone === 'muted') && 'text-muted-foreground',
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
