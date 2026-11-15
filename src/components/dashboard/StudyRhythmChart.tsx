import { useEffect, useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useRealtimeFocusSessions } from '@/hooks/useRealtimeFocusSessions';
import { fetchAllPaginated } from '@/lib/supabasePagination';
import { formatDurationHuman } from '@/lib/timeUtils';
import { useI18n } from '@/i18n';
import {
  averageFocusHours,
  buildCourseComparison,
  buildStudyRhythm,
  filterByCourse,
  rhythmRangeStart,
  type RhythmBucket,
  type RhythmGranularity,
} from '@/lib/studyRhythm';

type SessionRow = { duration_minutes: number | null; completed_at: string; session_type: string | null; course_id: string | null };
type ModuleRow = { hours: number | null; completed_at: string | null; course_id: string | null };
type CourseRow = { id: string; name: string };

const PERIODS: Record<RhythmGranularity, number> = { day: 30, week: 12 };
// A consulta cobre sempre o maior intervalo (12 semanas ≥ 30 dias).
const fetchStart = () => rhythmRangeStart('week', PERIODS.week);
const COMPARE = '__compare__';
const SERIES_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--tint-emerald))',
  'hsl(var(--tint-amber))',
  'hsl(var(--tint-rose))',
  'hsl(var(--tint-cyan))',
  'hsl(var(--tint-violet))',
];

const hoursLabel = (h: number) => formatDurationHuman(Math.round(h * 60));

export function StudyRhythmChart() {
  const { user } = useAuth();
  const { isReadOnly, getDemoData } = useGuestMode();
  const { t, lang } = useI18n();
  const refreshKey = useRealtimeFocusSessions(isReadOnly ? undefined : user?.id);
  const [granularity, setGranularity] = useState<RhythmGranularity>('day');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [compareMetric, setCompareMetric] = useState<'focus' | 'modules'>('focus');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReadOnly) {
      const demo = getDemoData() as unknown as {
        focusSessions?: SessionRow[];
        courseModules?: ModuleRow[];
        courses?: CourseRow[];
      };
      setSessions(demo.focusSessions ?? []);
      setModules(demo.courseModules ?? []);
      setCourses((demo.courses ?? []).map((c) => ({ id: c.id, name: c.name })));
      setLoading(false);
      return;
    }
    if (!user) return;
    let cancelled = false;
    const since = fetchStart().toISOString();
    (async () => {
      try {
        const [s, m, c] = await Promise.all([
          fetchAllPaginated<SessionRow>(() =>
            supabase
              .from('focus_sessions')
              .select('duration_minutes, completed_at, session_type, course_id')
              .eq('user_id', user.id)
              .eq('session_type', 'work')
              .gte('completed_at', since)
              .order('completed_at', { ascending: true }),
          ),
          fetchAllPaginated<ModuleRow>(() =>
            supabase
              .from('course_modules')
              .select('hours, completed_at, course_id, courses!inner(user_id)')
              .eq('courses.user_id', user.id)
              .eq('is_completed', true)
              .gte('completed_at', since)
              .order('completed_at', { ascending: true }) as never,
          ),
          supabase.from('courses').select('id, name').eq('user_id', user.id).order('name'),
        ]);
        if (!cancelled) {
          setSessions(s);
          setModules(m);
          setCourses((c.data || []) as CourseRow[]);
        }
      } catch (e) {
        console.error('Erro ao carregar ritmo de estudos:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isReadOnly, refreshKey]);

  const isCompare = courseFilter === COMPARE;
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? t('Curso', 'Course');

  const data = useMemo(
    () =>
      buildStudyRhythm({
        sessions: isCompare ? sessions : filterByCourse(sessions, courseFilter),
        modules: isCompare ? modules : filterByCourse(modules, courseFilter),
        granularity,
        periods: PERIODS[granularity],
        lang,
      }),
    [sessions, modules, granularity, courseFilter, isCompare, lang],
  );

  const comparison = useMemo(
    () =>
      isCompare
        ? buildCourseComparison({ sessions, modules, metric: compareMetric, granularity, periods: PERIODS[granularity], lang })
        : null,
    [isCompare, sessions, modules, compareMetric, granularity, lang],
  );

  // Curso selecionado que não existe mais (ex.: removido) volta para "todos".
  useEffect(() => {
    if (courseFilter !== 'all' && !isCompare && courses.length && !courses.some((c) => c.id === courseFilter)) {
      setCourseFilter('all');
    }
  }, [courses, courseFilter, isCompare]);

  const average = averageFocusHours(data);
  const totalFocus = data.reduce((s, b) => s + b.focusHours, 0);
  const current = data[data.length - 1];
  const previous = data[data.length - 2];
  const unit = granularity === 'day' ? t('dia', 'day') : t('semana', 'week');

  const RhythmTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: RhythmBucket }> }) => {
    if (!active || !payload?.length) return null;
    const b = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
        <p className="mb-1 text-sm font-medium capitalize text-foreground">{b.rangeLabel}</p>
        <p className="text-xs text-muted-foreground">
          {t('Foco cronometrado', 'Timed focus')}: <span className="font-semibold text-foreground">{hoursLabel(b.focusHours)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {t('Módulos concluídos', 'Modules completed')}: <span className="font-semibold text-foreground">{hoursLabel(b.moduleHours)}</span>
        </p>
      </div>
    );
  };

  const CompareTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: RhythmBucket; dataKey: string; value: number; color: string }>;
  }) => {
    if (!active || !payload?.length || !comparison) return null;
    const b = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
        <p className="mb-1 text-sm font-medium capitalize text-foreground">{b.rangeLabel}</p>
        {[...payload]
          .sort((x, y) => y.value - x.value)
          .map((p) => {
            const s = comparison.series.find((x) => x.dataKey === p.dataKey);
            return (
              <p key={p.dataKey} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                <span className="max-w-[160px] truncate">{s ? courseName(s.courseId) : ''}</span>:
                <span className="font-semibold text-foreground">{hoursLabel(p.value)}</span>
              </p>
            );
          })}
      </div>
    );
  };

  const axisProps = {
    tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
    tickLine: false,
    axisLine: false,
  } as const;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Activity className="h-4 w-4 text-primary" />
              {t('Ritmo de Estudos', 'Study Pace')}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {granularity === 'day' ? t('Últimos 30 dias', 'Last 30 days') : t('Últimas 12 semanas', 'Last 12 weeks')} ·{' '}
              {isCompare
                ? t('comparação entre cursos', 'course comparison')
                : t('tempo de foco e módulos concluídos', 'focus time and completed modules')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="h-8 w-[200px] rounded-lg text-xs" aria-label={t('Filtrar por curso', 'Filter by course')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('Todos os cursos', 'All courses')}</SelectItem>
                <SelectItem value={COMPARE}>{t('Comparar cursos', 'Compare courses')}</SelectItem>
                {courses.length > 0 && <SelectSeparator />}
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="block max-w-[220px] truncate">{c.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCompare && (
              <Tabs value={compareMetric} onValueChange={(v) => setCompareMetric(v as 'focus' | 'modules')}>
                <TabsList className="h-8">
                  <TabsTrigger value="focus" className="h-6 px-3 text-xs">{t('Foco', 'Focus')}</TabsTrigger>
                  <TabsTrigger value="modules" className="h-6 px-3 text-xs">{t('Módulos', 'Modules')}</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <Tabs value={granularity} onValueChange={(v) => setGranularity(v as RhythmGranularity)}>
              <TabsList className="h-8">
                <TabsTrigger value="day" className="h-6 px-3 text-xs">{t('Por dia', 'Daily')}</TabsTrigger>
                <TabsTrigger value="week" className="h-6 px-3 text-xs">{t('Por semana', 'Weekly')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-[260px] w-full rounded-xl" />
        ) : isCompare && comparison ? (
          <>
            {comparison.series.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                {t('Nenhum estudo registrado neste período para comparar.', 'No study recorded in this period to compare.')}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {comparison.series.map((s, i) => (
                    <button
                      type="button"
                      key={s.courseId}
                      onClick={() => setCourseFilter(s.courseId)}
                      className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-1.5 text-left transition-colors hover:bg-muted/40"
                      title={t('Ver só este curso', 'Show only this course')}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                      <span className="max-w-[160px] truncate text-xs font-medium">{courseName(s.courseId)}</span>
                      <span className="font-mono text-xs font-bold">{hoursLabel(s.totalHours)}</span>
                    </button>
                  ))}
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparison.rows} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" interval="preserveStartEnd" {...axisProps} />
                      <YAxis tickFormatter={(v) => `${v}h`} allowDecimals {...axisProps} />
                      <Tooltip content={<CompareTooltip />} />
                      {comparison.series.map((s, i) => (
                        <Line
                          key={s.dataKey}
                          type="monotone"
                          dataKey={s.dataKey}
                          name={courseName(s.courseId)}
                          stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                          strokeWidth={2}
                          dot={granularity === 'week'}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {compareMetric === 'focus'
                    ? t('Horas cronometradas no Foco por curso.', 'Hours timed in Focus per course.')
                    : t('Horas dos módulos concluídos por curso.', 'Hours of completed modules per course.')}{' '}
                  {t('Mostra até 6 cursos com mais horas.', 'Shows up to 6 courses with the most hours.')}
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {granularity === 'day' ? t('Hoje', 'Today') : t('Esta semana', 'This week')}
                </p>
                <p className="font-mono text-sm font-bold sm:text-base">{hoursLabel(current?.focusHours ?? 0)}</p>
                {previous && (
                  <p className="text-[10px] text-muted-foreground">
                    {granularity === 'day' ? t('Ontem', 'Yesterday') : t('Semana passada', 'Last week')}: {hoursLabel(previous.focusHours)}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t(`Média por ${unit}`, `Average per ${unit}`)}</p>
                <p className="font-mono text-sm font-bold sm:text-base">{hoursLabel(average)}</p>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('Total no período', 'Period total')}</p>
                <p className="font-mono text-sm font-bold sm:text-base">{hoursLabel(totalFocus)}</p>
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" interval="preserveStartEnd" {...axisProps} />
                  <YAxis tickFormatter={(v) => `${v}h`} allowDecimals {...axisProps} />
                  <Tooltip content={<RhythmTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                  {average > 0 && (
                    <ReferenceLine
                      y={average}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="4 4"
                      label={{ value: t('média', 'avg'), position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                  )}
                  <Bar dataKey="focusHours" name={t('Foco cronometrado', 'Timed focus')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="moduleHours" name={t('Módulos concluídos', 'Modules completed')} fill="hsl(var(--tint-emerald))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
