/**
 * PaceIndicatorCard
 * Exibe na página Foco se o usuário está adiantado, no prazo ou atrasado
 * em relação à meta ideal definida no plano de estudos do curso ativo.
 *
 * Recursos:
 * - Recalcula automaticamente a cada minuto (sem reload) → "Esperado da Semana"
 *   reseta na segunda-feira 00:01 no fuso do usuário.
 * - Mostra o intervalo usado para projetar (data inicial efetiva → hoje).
 * - Permite configurar quais dias contam como estudo direto no card.
 * - Tooltips explicando como "Esperado Semana" e "Esperado Hoje" são calculados.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Gauge, TrendingUp, TrendingDown, Minus, Clock, CalendarRange, Settings2, Info } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { evaluatePace, formatHoursHMS, derivePaceConfig, computeWeeklyExpectation } from '@/lib/studyPaceCalculator';
import { PaceTrendMiniChart } from './PaceTrendMiniChart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaceIndicatorCardProps {
  courseName: string;
  startDate: string;
  dailyHours: number;
  studyDays: string[];
  actualHours: number;
  userId?: string;
  courseId?: string;
  /** ID da linha em study_plan_courses — necessário para editar os dias de estudo */
  planCourseId?: string;
  refreshKey?: number;
  /** Callback após salvar nova lista de dias de estudo no plano */
  onStudyDaysUpdated?: () => void | Promise<void>;
}

const DAY_OPTIONS: Array<{ id: string; label: string; short: string }> = [
  { id: 'monday', label: 'Segunda', short: 'Seg' },
  { id: 'tuesday', label: 'Terça', short: 'Ter' },
  { id: 'wednesday', label: 'Quarta', short: 'Qua' },
  { id: 'thursday', label: 'Quinta', short: 'Qui' },
  { id: 'friday', label: 'Sexta', short: 'Sex' },
  { id: 'saturday', label: 'Sábado', short: 'Sáb' },
  { id: 'sunday', label: 'Domingo', short: 'Dom' },
];

const formatShortDate = (d: Date | null): string => {
  if (!d || !isValid(d)) return '—';
  return format(d, "dd 'de' MMM", { locale: ptBR });
};

export function PaceIndicatorCard({
  courseName,
  startDate,
  dailyHours,
  studyDays,
  actualHours,
  userId,
  courseId,
  planCourseId,
  refreshKey,
  onStudyDaysUpdated,
}: PaceIndicatorCardProps) {
  // ─── "Hoje" reativo: tick a cada 30s, garantindo reset semanal automático ───
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    // Listener adicional: quando a aba volta ao foco, força recálculo imediato
    const onVisibility = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // ─── Estado local p/ edição inline dos dias de estudo ───
  const [editing, setEditing] = useState(false);
  const [draftDays, setDraftDays] = useState<string[]>(studyDays);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setDraftDays(studyDays);
  }, [studyDays]);

  const config = derivePaceConfig(dailyHours);
  const indicator = useMemo(
    () =>
      evaluatePace({
        startDate,
        actualHours,
        idealHoursPerDay: config.ideal,
        studyDays,
        today: now,
      }),
    [startDate, actualHours, config.ideal, studyDays, now],
  );
  const weekly = useMemo(
    () =>
      computeWeeklyExpectation({
        idealHoursPerDay: config.ideal,
        studyDays,
        today: now,
      }),
    [config.ideal, studyDays, now],
  );

  // Intervalo da semana atual (segunda → domingo), usado como janela de projeção
  // exibida no card — coerente com "Esperado Semana".
  const { weekStart, weekEnd } = useMemo(() => {
    const dayOfWeek = now.getDay(); // 0=Dom, 1=Seg
    const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetToMonday);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return { weekStart: monday, weekEnd: sunday };
  }, [now]);

  const meta = {
    ahead: {
      label: 'Adiantado', color: 'text-emerald-500', bar: 'bg-emerald-500',
      bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30',
      icon: TrendingUp, message: 'Excelente! Você está acima da meta.',
    },
    'on-track': {
      label: 'No Prazo', color: 'text-primary', bar: 'bg-primary',
      bg: 'bg-primary/10', ring: 'ring-primary/30',
      icon: Minus, message: 'Você está seguindo o ritmo ideal.',
    },
    behind: {
      label: 'Atrasado', color: 'text-amber-500', bar: 'bg-amber-500',
      bg: 'bg-amber-500/10', ring: 'ring-amber-500/30',
      icon: TrendingDown, message: 'Considere dedicar mais tempo para recuperar.',
    },
    unknown: {
      label: 'Aguardando', color: 'text-muted-foreground', bar: 'bg-muted-foreground/40',
      bg: 'bg-muted/30', ring: 'ring-border',
      icon: Clock, message: 'Aguardando dados suficientes.',
    },
  }[indicator.status];

  const Icon = meta.icon;
  const rawPct = Number.isFinite(indicator.percentage) ? indicator.percentage : 0;
  const barPct = Math.max(0, Math.min(100, rawPct));

  const toggleDraftDay = (id: string) => {
    setDraftDays((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const handleSaveDays = async () => {
    if (!planCourseId) {
      toast.error('Não foi possível identificar o curso no plano.');
      return;
    }
    if (draftDays.length === 0) {
      toast.error('Selecione pelo menos um dia de estudo.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('study_plan_courses')
        .update({ study_days: draftDays })
        .eq('id', planCourseId);
      if (error) throw error;
      toast.success('Dias de estudo atualizados.');
      setEditing(false);
      await onStudyDaysUpdated?.();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao salvar dias de estudo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn('border-slate-800/50 bg-slate-900/50 rounded-2xl', meta.ring)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={cn('p-2 rounded-xl shrink-0', meta.bg)}>
                <Gauge className={cn('h-5 w-5', meta.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm uppercase tracking-wider text-slate-400 font-semibold">
                  Ritmo do Curso
                </p>
                <p className="text-base font-bold truncate text-white">{courseName}</p>
              </div>
            </div>
            <Badge className={cn('gap-1.5 border-0 shrink-0 text-sm px-2 py-0.5', meta.bg, meta.color)}>
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </Badge>
          </div>

          {/* ─── Intervalo de projeção + editor de dias de estudo ─── */}
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-slate-400 min-w-0">
              <CalendarRange className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Projetando de <span className="font-semibold text-white">{formatShortDate(projectionStart)}</span>
                {' '}até <span className="font-semibold text-white">{formatShortDate(now)}</span>
              </span>
            </div>

            {planCourseId && (
              <Popover open={editing} onOpenChange={setEditing}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs gap-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Dias de estudo
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-4 bg-slate-900 border-slate-800">
                  <p className="text-sm font-semibold mb-2 text-white">Dias que contam como estudo</p>
                  <p className="text-xs text-slate-400 mb-3">
                    Atualiza imediatamente "Esperado Hoje" e "Esperado Semana".
                  </p>
                  <div className="space-y-2">
                    {DAY_OPTIONS.map((d) => (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-800/50 rounded px-2 py-1.5 text-white"
                      >
                        <Checkbox
                          checked={draftDays.includes(d.id)}
                          onCheckedChange={() => toggleDraftDay(d.id)}
                          className="border-slate-600"
                        />
                        <span>{d.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs bg-slate-800/50 hover:bg-slate-800 text-slate-300"
                      onClick={() => {
                        setDraftDays(studyDays);
                        setEditing(false);
                      }}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600"
                      onClick={handleSaveDays}
                      disabled={saving}
                    >
                      {saving ? 'Salvando…' : 'Salvar'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="relative h-2 mb-2 w-full overflow-hidden rounded-full bg-background/60 cursor-help"
                  role="progressbar"
                  aria-valuenow={Math.round(rawPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <motion.div
                    className={cn('h-full rounded-full', meta.bar)}
                    initial={{ width: 0 }}
                    animate={{ width: `${barPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {indicator.status === 'unknown' ? (
                  <span>Aguardando dados suficientes</span>
                ) : (
                  <div className="space-y-0.5">
                    <p className={cn('font-semibold', meta.color)}>
                      {indicator.diffHours >= 0 ? '+' : '−'}
                      {formatHoursHMS(Math.abs(indicator.diffHours))}{' '}
                      {indicator.diffHours >= 0 ? 'adiantado' : 'atrasado'}
                    </p>
                    <p className="text-muted-foreground">
                      {formatHoursHMS(indicator.actualHours)} de {formatHoursHMS(indicator.expectedHours)} esperado
                    </p>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-3 text-center">
              {/* Esperado Semana */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2 rounded bg-background/60 min-w-0 cursor-help">
                    <p className="text-xs uppercase text-muted-foreground truncate flex items-center justify-center gap-1">
                      Esperado Semana <Info className="h-3 w-3" />
                    </p>
                    <p className="text-sm sm:text-base font-mono font-semibold truncate mt-0.5">
                      {formatHoursHMS(weekly.weeklyExpectedHours)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground/80 truncate mt-0.5">
                      {weekly.studyDaysThisWeek} {weekly.studyDaysThisWeek === 1 ? 'dia' : 'dias'} × {formatHoursHMS(config.ideal)}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-sm max-w-xs">
                  <p className="font-semibold mb-1">Como é calculado</p>
                  <p className="text-muted-foreground">
                    Soma das horas previstas de segunda a domingo da semana atual,
                    contando apenas os dias selecionados como estudo
                    ({weekly.studyDaysThisWeek} {weekly.studyDaysThisWeek === 1 ? 'dia' : 'dias'})
                    × {formatHoursHMS(config.ideal)} por dia.
                    Reinicia toda segunda-feira às 00:00 no seu fuso horário.
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* Esperado Hoje */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2 rounded bg-background/60 min-w-0 cursor-help">
                    <p className="text-xs uppercase text-muted-foreground truncate flex items-center justify-center gap-1">
                      Esperado Hoje <Info className="h-3 w-3" />
                    </p>
                    <p className="text-sm sm:text-base font-mono font-semibold truncate mt-0.5">
                      {weekly.isStudyDayToday ? formatHoursHMS(weekly.dailyExpectedHours) : '—'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground/80 truncate mt-0.5">
                      {weekly.isStudyDayToday ? 'dia de estudo' : 'dia de descanso'}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-sm max-w-xs">
                  <p className="font-semibold mb-1">Como é calculado</p>
                  <p className="text-muted-foreground">
                    Se hoje ({format(now, 'EEEE', { locale: ptBR })}) estiver entre os dias de estudo,
                    usa a meta diária do plano: <span className="font-mono">{formatHoursHMS(config.ideal)}</span>.
                    Caso contrário, é um dia de descanso (—).
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3 text-center">
            <div className="p-2 rounded bg-background/60 min-w-0">
              <p className="text-xs uppercase text-muted-foreground truncate">Esperado Total</p>
              <p className="text-sm sm:text-base font-mono font-semibold truncate mt-0.5">
                {formatHoursHMS(indicator.expectedHours)}
              </p>
            </div>
            <div className="p-2 rounded bg-background/60 min-w-0">
              <p className="text-xs uppercase text-muted-foreground truncate">Estudado</p>
              <p className={cn('text-sm sm:text-base font-mono font-semibold truncate mt-0.5', meta.color)}>
                {formatHoursHMS(indicator.actualHours)}
              </p>
            </div>
            <div className="p-2 rounded bg-background/60 min-w-0">
              <p className="text-xs uppercase text-muted-foreground truncate">% Ideal</p>
              <p className={cn('text-sm sm:text-base font-mono font-semibold truncate mt-0.5', meta.color)}>
                {indicator.percentage}%
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-4 text-center italic">
            {meta.message}
          </p>

          {userId && courseId && indicator.status !== 'unknown' && (
            <PaceTrendMiniChart
              userId={userId}
              courseId={courseId}
              startDate={startDate}
              idealHoursPerDay={config.ideal}
              studyDays={studyDays}
              refreshKey={refreshKey}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
