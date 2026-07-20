import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { Flame, Activity, PieChart as PieIcon, Target, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  startOfWeek, endOfWeek, subDays, subWeeks, eachDayOfInterval,
  format, addWeeks, differenceInMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FocusRow {
  duration_minutes: number | null;
  completed_at: string;
  session_type: string | null;
  course_id: string | null;
}

interface CourseRow {
  id: string;
  name: string;
  category: string | null;
}

interface WeeklyGoalRow {
  week_start: string;
  focus_minutes_goal: number | null;
}

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--accent))',
  'hsl(var(--primary))', 'hsl(var(--success))',
];

interface Props {
  /** Restrict data to a single course (used on Focus page) */
  courseId?: string;
  /** Hide sections that don't apply on some pages */
  hide?: Array<'heatmap' | 'comparison' | 'distribution' | 'goals'>;
  title?: string;
  description?: string;
}

export function AdvancedAnalytics({ courseId, hide = [], title, description }: Props) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<FocusRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [goals, setGoals] = useState<WeeklyGoalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = subDays(new Date(), 90).toISOString();

      let focusQ = supabase
        .from('focus_sessions')
        .select('duration_minutes, completed_at, session_type, course_id')
        .eq('user_id', user.id)
        .eq('session_type', 'work')
        .gte('completed_at', since)
        .order('completed_at', { ascending: false });
      if (courseId) focusQ = focusQ.eq('course_id', courseId);

      const [focusRes, coursesRes, goalsRes] = await Promise.all([
        focusQ,
        supabase.from('courses').select('id, name, category').eq('user_id', user.id),
        supabase
          .from('weekly_goals')
          .select('week_start, focus_minutes_goal')
          .eq('user_id', user.id)
          .gte('week_start', subWeeks(new Date(), 8).toISOString().slice(0, 10)),
      ]);
      if (cancelled) return;
      setSessions((focusRes.data as FocusRow[]) ?? []);
      setCourses((coursesRes.data as CourseRow[]) ?? []);
      setGoals((goalsRes.data as WeeklyGoalRow[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, courseId]);

  /* ─── Heatmap (last 8 weeks, day x hour bucket 6h) ─── */
  const heatmap = useMemo(() => {
    // rows = weekday, cols = hour buckets (0-5, 6-11, 12-17, 18-23)
    const buckets = ['00–06', '06–12', '12–18', '18–24'];
    const grid: number[][] = DAYS_PT.map(() => buckets.map(() => 0));
    sessions.forEach((s) => {
      const d = new Date(s.completed_at);
      const dow = d.getDay();
      const bucket = Math.floor(d.getHours() / 6);
      grid[dow][bucket] += (s.duration_minutes ?? 0);
    });
    const max = Math.max(1, ...grid.flat());
    return { buckets, grid, max };
  }, [sessions]);

  /* ─── Period comparison ─── */
  const comparison = useMemo(() => {
    const now = new Date();
    const sum = (from: Date, to: Date) =>
      sessions
        .filter((s) => {
          const t = new Date(s.completed_at).getTime();
          return t >= from.getTime() && t <= to.getTime();
        })
        .reduce((a, s) => a + (s.duration_minutes ?? 0), 0);

    const week = sum(subDays(now, 7), now);
    const prevWeek = sum(subDays(now, 14), subDays(now, 7));
    const month = sum(subDays(now, 30), now);
    const prevMonth = sum(subDays(now, 60), subDays(now, 30));
    const quarter = sum(subDays(now, 90), now);
    const prevQuarter = 0; // não temos > 90 dias no fetch
    return [
      { label: '7 dias', atual: Math.round(week / 60 * 10) / 10, anterior: Math.round(prevWeek / 60 * 10) / 10 },
      { label: '30 dias', atual: Math.round(month / 60 * 10) / 10, anterior: Math.round(prevMonth / 60 * 10) / 10 },
      { label: '90 dias', atual: Math.round(quarter / 60 * 10) / 10, anterior: Math.round(prevQuarter / 60 * 10) / 10 },
    ];
  }, [sessions]);

  /* ─── Distribution by course/category ─── */
  const distribution = useMemo(() => {
    const byId: Record<string, number> = {};
    sessions.forEach((s) => {
      const k = s.course_id ?? '__none__';
      byId[k] = (byId[k] ?? 0) + (s.duration_minutes ?? 0);
    });
    const courseMap = new Map(courses.map((c) => [c.id, c.name]));
    return Object.entries(byId)
      .map(([id, mins], i) => ({
        name: id === '__none__' ? 'Sem curso' : (courseMap.get(id) ?? 'Curso removido'),
        value: Math.round(mins / 60 * 10) / 10,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [sessions, courses]);

  /* ─── Goals vs actual (last 6 weeks) ─── */
  const goalsVsActual = useMemo(() => {
    const weeks: { label: string; realizado: number; meta: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const end = endOfWeek(start, { weekStartsOn: 1 });
      const key = format(start, 'yyyy-MM-dd');
      const realizedMin = sessions
        .filter((s) => {
          const t = new Date(s.completed_at);
          return t >= start && t <= end;
        })
        .reduce((a, s) => a + (s.duration_minutes ?? 0), 0);
      const goal = goals.find((g) => g.week_start === key)?.focus_minutes_goal ?? 0;
      weeks.push({
        label: format(start, 'dd/MM', { locale: ptBR }),
        realizado: Math.round(realizedMin / 60 * 10) / 10,
        meta: Math.round(goal / 60 * 10) / 10,
      });
    }
    return weeks;
  }, [sessions, goals]);

  const show = (k: Props['hide'][number]) => !hide.includes(k);

  return (
    <div className="space-y-6">
      {(title || description) && (
        <div className="space-y-1">
          {title && <h2 className="text-lg font-bold font-display">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
        {show('heatmap') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Heatmap por hora × dia
              </CardTitle>
              <CardDescription>Quando você mais foca (últimos 90 dias)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-separate border-spacing-1">
                  <thead>
                    <tr>
                      <th className="w-10" />
                      {heatmap.buckets.map((b) => (
                        <th key={b} className="font-medium text-muted-foreground">{b}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_PT.map((d, i) => (
                      <tr key={d}>
                        <td className="pr-2 text-right text-muted-foreground font-medium">{d}</td>
                        {heatmap.grid[i].map((v, j) => {
                          const opacity = v === 0 ? 0.06 : 0.15 + (v / heatmap.max) * 0.85;
                          return (
                            <td key={j}>
                              <div
                                className="h-8 rounded-sm flex items-center justify-center"
                                title={`${d} ${heatmap.buckets[j]} — ${Math.round(v)} min`}
                                style={{ backgroundColor: `hsl(var(--primary) / ${opacity})` }}
                              >
                                <span className="text-[10px] text-foreground/70">
                                  {v > 0 ? Math.round(v / 60 * 10) / 10 : ''}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Valores em horas por faixa.</p>
            </CardContent>
          </Card>
        )}

        {show('comparison') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Comparativo de períodos
              </CardTitle>
              <CardDescription>Horas de foco: atual vs período anterior</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-muted-foreground text-xs" />
                    <YAxis className="text-muted-foreground text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                      }}
                      formatter={(v: number) => [`${v} h`, '']}
                    />
                    <Legend />
                    <Bar dataKey="anterior" name="Anterior" fill="hsl(var(--muted-foreground) / 0.4)" />
                    <Bar dataKey="atual" name="Atual" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {show('distribution') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieIcon className="h-5 w-5 text-accent" />
                Distribuição por curso
              </CardTitle>
              <CardDescription>Foco por curso nos últimos 90 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                {distribution.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {distribution.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, _n, p: any) => [`${v} h`, p.payload.name]}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Sem dados de foco ainda.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {show('goals') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-success" />
                Metas vs Realizado
              </CardTitle>
              <CardDescription>Últimas 6 semanas (h)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={goalsVsActual}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-muted-foreground text-xs" />
                    <YAxis className="text-muted-foreground text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                      }}
                      formatter={(v: number) => [`${v} h`, '']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="meta" name="Meta" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="realizado" name="Realizado" stroke="hsl(var(--success))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Activity className="h-3 w-3 animate-pulse" /> Carregando análises...
        </p>
      )}
    </div>
  );
}

export default AdvancedAnalytics;