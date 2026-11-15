/**
 * Ritmo de estudos: agrupa o tempo estudado por dia ou por semana.
 * - Foco = minutos cronometrados em sessões `work` (focus_sessions).
 * - Módulos = horas dos módulos marcados como concluídos (course_modules.completed_at).
 * Semanas começam na segunda-feira. Períodos sem estudo aparecem com 0.
 */
import { addDays, addWeeks, format, startOfDay, startOfWeek, subDays, subWeeks } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';

export type RhythmGranularity = 'day' | 'week';

export interface RhythmBucket {
  key: string; // yyyy-MM-dd do início do período
  label: string;
  rangeLabel: string;
  focusHours: number;
  moduleHours: number;
  isCurrent: boolean;
}

export interface RhythmInput {
  sessions: { duration_minutes: number | null; completed_at: string; session_type?: string | null }[];
  modules: { hours: number | null; completed_at: string | null }[];
  granularity: RhythmGranularity;
  periods: number;
  now?: Date;
  /** Idioma dos rótulos (padrão: português). */
  lang?: 'pt' | 'en';
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function periodStart(date: Date, granularity: RhythmGranularity): Date {
  return granularity === 'week' ? startOfWeek(date, { weekStartsOn: 1 }) : startOfDay(date);
}

/** Primeiro instante coberto pelo gráfico (para filtrar a consulta). */
export function rhythmRangeStart(granularity: RhythmGranularity, periods: number, now = new Date()): Date {
  const current = periodStart(now, granularity);
  return granularity === 'week' ? subWeeks(current, periods - 1) : subDays(current, periods - 1);
}

export function buildStudyRhythm({ sessions, modules, granularity, periods, now = new Date(), lang = 'pt' }: RhythmInput): RhythmBucket[] {
  const locale = lang === 'en' ? enUS : ptBR;
  const short = lang === 'en' ? 'MM/dd' : 'dd/MM';
  const long = lang === 'en' ? 'EEEE, MMMM d' : "EEEE, dd 'de' MMMM";
  const first = rhythmRangeStart(granularity, periods, now);
  const currentKey = format(periodStart(now, granularity), 'yyyy-MM-dd');
  const buckets = new Map<string, RhythmBucket>();

  for (let i = 0; i < periods; i++) {
    const start = granularity === 'week' ? addWeeks(first, i) : addDays(first, i);
    const key = format(start, 'yyyy-MM-dd');
    const end = granularity === 'week' ? addDays(start, 6) : start;
    buckets.set(key, {
      key,
      label: format(start, short, { locale }),
      rangeLabel:
        granularity === 'week'
          ? `${format(start, short, { locale })} – ${format(end, short, { locale })}`
          : format(start, long, { locale }),
      focusHours: 0,
      moduleHours: 0,
      isCurrent: key === currentKey,
    });
  }

  const bucketFor = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return undefined;
    return buckets.get(format(periodStart(d, granularity), 'yyyy-MM-dd'));
  };

  for (const s of sessions) {
    if (s.session_type && s.session_type !== 'work') continue;
    const b = bucketFor(s.completed_at);
    if (b) b.focusHours += (s.duration_minutes || 0) / 60;
  }
  for (const m of modules) {
    if (!m.completed_at) continue;
    const b = bucketFor(m.completed_at);
    if (b) b.moduleHours += Number(m.hours) || 0;
  }

  return Array.from(buckets.values()).map((b) => ({
    ...b,
    focusHours: round2(b.focusHours),
    moduleHours: round2(b.moduleHours),
  }));
}

/** Média de foco por período, contando só os períodos já iniciados (inclui o atual). */
export function averageFocusHours(buckets: RhythmBucket[]): number {
  if (buckets.length === 0) return 0;
  const total = buckets.reduce((s, b) => s + b.focusHours, 0);
  return round2(total / buckets.length);
}

export interface CourseSeries {
  courseId: string;
  dataKey: string;
  totalHours: number;
}

/**
 * Comparação entre cursos: uma série de horas por curso (foco ou módulos).
 * Mantém os `maxCourses` cursos com mais horas no período, em ordem decrescente.
 */
export function buildCourseComparison(input: {
  sessions: (RhythmInput['sessions'][number] & { course_id: string | null })[];
  modules: (RhythmInput['modules'][number] & { course_id: string | null })[];
  metric: 'focus' | 'modules';
  granularity: RhythmGranularity;
  periods: number;
  maxCourses?: number;
  now?: Date;
  lang?: 'pt' | 'en';
}): { rows: (RhythmBucket & Record<string, number | string | boolean>)[]; series: CourseSeries[] } {
  const { sessions, modules, metric, granularity, periods, maxCourses = 6, now = new Date(), lang = 'pt' } = input;
  const ids = Array.from(
    new Set([...sessions.map((s) => s.course_id), ...modules.map((m) => m.course_id)].filter(Boolean) as string[]),
  );
  const perCourse = ids.map((id) => {
    const buckets = buildStudyRhythm({
      sessions: sessions.filter((s) => s.course_id === id),
      modules: modules.filter((m) => m.course_id === id),
      granularity,
      periods,
      now,
    });
    const values = buckets.map((b) => (metric === 'focus' ? b.focusHours : b.moduleHours));
    return { id, values, total: round2(values.reduce((a, v) => a + v, 0)) };
  });
  const top = perCourse.filter((c) => c.total > 0).sort((a, b) => b.total - a.total).slice(0, maxCourses);
  const base = buildStudyRhythm({ sessions: [], modules: [], granularity, periods, now, lang });
  const rows = base.map((b, i) => {
    const row: RhythmBucket & Record<string, number | string | boolean> = { ...b };
    top.forEach((c) => {
      row[`c_${c.id}`] = c.values[i];
    });
    return row;
  });
  return {
    rows,
    series: top.map((c) => ({ courseId: c.id, dataKey: `c_${c.id}`, totalHours: c.total })),
  };
}

/** Mantém só as sessões/módulos de um curso (ou tudo, quando `courseId` é 'all'). */
export function filterByCourse<T extends { course_id: string | null }>(rows: T[], courseId: string): T[] {
  return courseId === 'all' ? rows : rows.filter((r) => r.course_id === courseId);
}
