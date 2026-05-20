/**
 * PaceTrendMiniChart
 * Mini gráfico de linha (recharts) comparando horas acumuladas REAIS vs ESPERADAS
 * nas últimas 4 semanas, a partir do início do plano de estudos do curso.
 *
 * - Real: somatório acumulado das focus_sessions do curso por semana
 * - Esperado: dias de estudo decorridos × idealHoursPerDay (acumulado por semana)
 */

import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { addDays, differenceInDays, parseISO, startOfWeek, format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { formatHoursHMS } from '@/lib/studyPaceCalculator';

interface PaceTrendMiniChartProps {
  userId: string;
  courseId: string;
  startDate: string; // plano: data de início
  idealHoursPerDay: number;
  studyDays: string[];
  /** chave para forçar refetch quando uma sessão é salva */
  refreshKey?: number;
}

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

interface WeekPoint {
  label: string;
  real: number;
  esperado: number;
}

export function PaceTrendMiniChart({
  userId,
  courseId,
  startDate,
  idealHoursPerDay,
  studyDays,
  refreshKey = 0,
}: PaceTrendMiniChartProps) {
  const [sessions, setSessions] = useState<Array<{ completed_at: string; duration_minutes: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'4w' | '8w' | 'all'>('4w');

  // Janela: depende do range escolhido, nunca antes do startDate.
  const { windowStart, windowEnd, maxBuckets } = useMemo(() => {
    const today = new Date();
    const planStart = parseISO(startDate);
    if (range === 'all') {
      const start = isValid(planStart) ? planStart : addDays(today, -27);
      return { windowStart: start, windowEnd: today, maxBuckets: Infinity };
    }
    const weeks = range === '8w' ? 8 : 4;
    const cutoff = addDays(today, -(weeks * 7 - 1));
    const start = isValid(planStart) && planStart > cutoff ? planStart : cutoff;
    return { windowStart: start, windowEnd: today, maxBuckets: weeks };
  }, [startDate, range]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const fromISO = new Date(
        windowStart.getFullYear(),
        windowStart.getMonth(),
        windowStart.getDate(),
      ).toISOString();
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('completed_at, duration_minutes')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .gte('completed_at', fromISO)
        .order('completed_at', { ascending: true });
      if (cancelled) return;
      if (error || !data) {
        setSessions([]);
      } else {
        setSessions(data as Array<{ completed_at: string; duration_minutes: number }>);
      }
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [userId, courseId, windowStart, refreshKey]);

  const data: WeekPoint[] = useMemo(() => {
    // Agrupar em buckets semanais (segunda como início)
    const buckets: { start: Date; end: Date; label: string }[] = [];
    let cursor = startOfWeek(windowStart, { weekStartsOn: 1 });
    const endWeek = startOfWeek(windowEnd, { weekStartsOn: 1 });
    while (cursor <= endWeek) {
      const end = addDays(cursor, 6);
      buckets.push({
        start: new Date(cursor),
        end,
        label: format(cursor, "dd/MM", { locale: ptBR }),
      });
      cursor = addDays(cursor, 7);
    }

    // Limita ao número máximo de buckets do range escolhido
    const recent = Number.isFinite(maxBuckets) ? buckets.slice(-(maxBuckets as number)) : buckets;

    const allowed = new Set(
      studyDays.map((d) => DAY_MAP[d]).filter((n) => n !== undefined),
    );
    const planStart = parseISO(startDate);

    let cumulativeReal = 0;
    let cumulativeExpected = 0;
    let lastEnd: Date | null = null;

    return recent.map((bucket) => {
      // Real: soma das sessões dentro do bucket
      const bucketReal =
        sessions
          .filter((s) => {
            const d = new Date(s.completed_at);
            return d >= bucket.start && d <= addDays(bucket.end, 1);
          })
          .reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60;

      // Esperado: contar dias de estudo dentro do bucket que sejam ≥ planStart e ≤ hoje
      let studyDaysInBucket = 0;
      for (let i = 0; i < 7; i++) {
        const day = addDays(bucket.start, i);
        if (day < planStart) continue;
        if (day > windowEnd) break;
        if (allowed.has(day.getDay())) studyDaysInBucket++;
      }
      const bucketExpected = studyDaysInBucket * idealHoursPerDay;

      cumulativeReal += bucketReal;
      cumulativeExpected += bucketExpected;
      lastEnd = bucket.end;

      return {
        label: bucket.label,
        real: Number(cumulativeReal.toFixed(2)),
        esperado: Number(cumulativeExpected.toFixed(2)),
      };
    });
  }, [sessions, windowStart, windowEnd, studyDays, idealHoursPerDay, startDate, maxBuckets]);

  if (loading) {
    return (
      <div className="h-28 flex items-center justify-center text-[10px] text-muted-foreground">
        Carregando histórico…
      </div>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1 gap-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
          Real vs Esperado
        </p>
        <div className="inline-flex items-center rounded-md bg-background/60 p-0.5 border border-border/50 shrink-0">
          {([
            { v: '4w', label: '4s' },
            { v: '8w', label: '8s' },
            { v: 'all', label: 'Tudo' },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setRange(opt.v)}
              className={
                'px-2 py-0.5 text-[10px] font-semibold rounded-sm transition-colors ' +
                (range === opt.v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 11,
                padding: '6px 8px',
              }}
              formatter={(value: number, name: string) => [
                formatHoursHMS(value),
                name === 'real' ? 'Real' : 'Esperado',
              ]}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10 }}
              iconType="line"
              formatter={(v) => (v === 'real' ? 'Real' : 'Esperado')}
            />
            <Line
              type="monotone"
              dataKey="esperado"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={true}
            />
            <Line
              type="monotone"
              dataKey="real"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: 'hsl(var(--primary))' }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
