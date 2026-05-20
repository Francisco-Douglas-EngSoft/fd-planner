/**
 * ModuleDetailsPopover
 * - Submódulos com toggle em tempo real
 * - Barra de progresso animada (festeja em 100%)
 * - Mini-gráfico de horas dos últimos 7 dias (filtrado por módulo quando disponível)
 * - Edição de notas inline com auto-save (debounce) e indicador
 * - Botão para iniciar foco no módulo
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  FileText,
  ListTree,
  Play,
  Loader2,
  BarChart3,
  Sparkles,
  Check,
  CloudUpload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatHoursHMS } from '@/lib/studyPaceCalculator';
import { toast } from 'sonner';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface ModuleDetailsPopoverProps {
  moduleId: string;
  moduleName: string;
  moduleHours: number;
  isCompleted: boolean;
  courseId: string;
  children: React.ReactNode;
  onClosePlanDialog?: () => void;
}

interface Submodule {
  id: string;
  name: string;
  hours: number | null;
  is_completed: boolean;
  order_index: number;
}

interface DayPoint {
  day: string;
  hours: number;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function ModuleDetailsPopover({
  moduleId,
  moduleName,
  moduleHours,
  isCompleted,
  courseId,
  children,
  onClosePlanDialog,
}: ModuleDetailsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [submodules, setSubmodules] = useState<Submodule[]>([]);
  const [notes, setNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [history, setHistory] = useState<DayPoint[]>([]);
  const [historyByModule, setHistoryByModule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [celebrate, setCelebrate] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef<number | null>(null);
  const previousProgressRef = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const sevenDaysAgo = startOfDay(subDays(new Date(), 6)).toISOString();

      const [subRes, modRes] = await Promise.all([
        supabase
          .from('course_submodules')
          .select('id, name, hours, is_completed, order_index')
          .eq('module_id', moduleId)
          .order('order_index', { ascending: true }),
        supabase
          .from('course_modules')
          .select('notes')
          .eq('id', moduleId)
          .maybeSingle(),
      ]);

      // Tenta buscar por module_id primeiro; se a coluna não existir, faz fallback por curso.
      let sessionsData: Array<{ completed_at: string; duration_minutes: number }> = [];
      let usedModule = false;
      try {
        const r = await (supabase
          .from('focus_sessions')
          .select('completed_at, duration_minutes')
          .eq('module_id', moduleId)
          .eq('session_type', 'work')
          .gte('completed_at', sevenDaysAgo) as unknown as Promise<{
          data: typeof sessionsData | null;
          error: { message: string } | null;
        }>);
        if (!r.error && r.data) {
          sessionsData = r.data;
          usedModule = true;
        } else {
          throw r.error || new Error('no module column');
        }
      } catch {
        const fb = await supabase
          .from('focus_sessions')
          .select('completed_at, duration_minutes')
          .eq('course_id', courseId)
          .eq('session_type', 'work')
          .gte('completed_at', sevenDaysAgo);
        sessionsData = (fb.data || []) as typeof sessionsData;
        usedModule = false;
      }

      if (cancelled) return;

      setSubmodules((subRes.data || []) as Submodule[]);
      const fetchedNotes = (modRes.data?.notes as string | null) || '';
      setNotes(fetchedNotes);
      setOriginalNotes(fetchedNotes);
      setSaveStatus('idle');
      setHistoryByModule(usedModule);

      // Buckets últimos 7 dias
      const buckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = startOfDay(subDays(new Date(), i));
        buckets[format(d, 'yyyy-MM-dd')] = 0;
      }
      sessionsData.forEach((s) => {
        const key = format(startOfDay(new Date(s.completed_at)), 'yyyy-MM-dd');
        if (key in buckets) buckets[key] += (s.duration_minutes || 0) / 60;
      });
      setHistory(
        Object.entries(buckets).map(([date, hours]) => ({
          day: format(new Date(date), 'EEE', { locale: ptBR }).replace('.', ''),
          hours: Number(hours.toFixed(2)),
        })),
      );

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, moduleId, courseId]);

  // Auto-save de notas (debounce)
  useEffect(() => {
    if (!open) return;
    if (notes === originalNotes) return;
    setSaveStatus('saving');
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from('course_modules')
        .update({ notes: notes || null })
        .eq('id', moduleId);
      if (error) {
        setSaveStatus('error');
        toast.error('Erro ao salvar notas');
      } else {
        setOriginalNotes(notes);
        setSaveStatus('saved');
        window.setTimeout(() => setSaveStatus('idle'), 1500);
      }
    }, 800);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [notes, originalNotes, open, moduleId]);

  const startFocus = () => {
    try {
      localStorage.setItem('fdplanner_selected_course', courseId);
      localStorage.setItem('fdplanner_focus_target_module', moduleId);
    } catch {
      // ignore
    }
    setOpen(false);
    onClosePlanDialog?.();
    navigate('/foco');
  };

  const toggleSubmodule = async (sub: Submodule) => {
    setTogglingId(sub.id);
    const newValue = !sub.is_completed;
    setSubmodules((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, is_completed: newValue } : s)),
    );
    const { error } = await supabase
      .from('course_submodules')
      .update({ is_completed: newValue })
      .eq('id', sub.id);

    if (error) {
      setSubmodules((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, is_completed: !newValue } : s)),
      );
      toast.error('Erro ao atualizar submódulo');
    } else {
      toast.success(newValue ? 'Submódulo concluído' : 'Submódulo reaberto');
    }
    setTogglingId(null);
  };

  const completedSubs = submodules.filter((s) => s.is_completed).length;
  const totalSubs = submodules.length;
  const progressPct = totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0;

  // Detecta transição para 100%
  useEffect(() => {
    if (progressPct === 100 && previousProgressRef.current < 100 && totalSubs > 0) {
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 2200);
    }
    previousProgressRef.current = progressPct;
  }, [progressPct, totalSubs]);

  const totalWeekHours = useMemo(
    () => history.reduce((sum, h) => sum + h.hours, 0),
    [history],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="w-[calc(100vw-2rem)] sm:w-96 p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-3 border-b bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
          <AnimatePresence>
            {celebrate && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.4, 1] }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-primary/10 to-transparent"
                />
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
                    animate={{
                      opacity: 0,
                      x: Math.cos((i * Math.PI * 2) / 8) * 80,
                      y: Math.sin((i * Math.PI * 2) / 8) * 60,
                      scale: 1,
                    }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="absolute"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                Módulo
              </p>
              <p className="text-sm font-bold leading-tight break-words">{moduleName}</p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono shrink-0">
              {formatHoursHMS(moduleHours)}
            </Badge>
          </div>
          {isCompleted && (
            <Badge className="relative mt-2 text-[10px] bg-emerald-500/15 text-emerald-600 border-0 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Concluído
            </Badge>
          )}
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-3 space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando detalhes...
              </div>
            )}

            {!loading && (
              <>
                {/* Submódulos + barra de progresso */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <ListTree className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Submódulos
                      </span>
                    </div>
                    {totalSubs > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {completedSubs}/{totalSubs}
                      </Badge>
                    )}
                  </div>

                  {totalSubs > 0 && (
                    <div className="mb-2 space-y-1">
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={cn(
                            'absolute inset-y-0 left-0 rounded-full',
                            progressPct === 100
                              ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 bg-[length:200%_100%]'
                              : 'bg-gradient-to-r from-primary to-primary/70',
                          )}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${progressPct}%`,
                            backgroundPosition: progressPct === 100 ? ['0% 0%', '200% 0%'] : '0% 0%',
                          }}
                          transition={{
                            width: { duration: 0.6, ease: 'easeOut' },
                            backgroundPosition: progressPct === 100
                              ? { duration: 2, repeat: Infinity, ease: 'linear' }
                              : { duration: 0 },
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-right tabular-nums">
                        {progressPct.toFixed(0)}% concluído
                      </p>
                    </div>
                  )}

                  {totalSubs === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic px-2 py-1.5 rounded bg-muted/30">
                      Nenhum submódulo cadastrado.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {submodules.map((sub) => {
                        const isToggling = togglingId === sub.id;
                        return (
                          <li
                            key={sub.id}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 text-xs group"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isToggling) toggleSubmodule(sub);
                              }}
                              disabled={isToggling}
                              aria-label={
                                sub.is_completed
                                  ? 'Marcar como não concluído'
                                  : 'Marcar como concluído'
                              }
                              className="shrink-0 transition-transform hover:scale-110 disabled:opacity-50"
                            >
                              {isToggling ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              ) : sub.is_completed ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                              )}
                            </button>
                            <span
                              className={cn(
                                'flex-1 truncate',
                                sub.is_completed && 'line-through text-muted-foreground',
                              )}
                            >
                              {sub.name}
                            </span>
                            {sub.hours ? (
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                {formatHoursHMS(sub.hours)}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Histórico 7 dias */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Últimos 7 dias
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5 font-mono">
                      {formatHoursHMS(totalWeekHours)}
                    </Badge>
                  </div>
                  <div className="h-24 rounded bg-muted/30 p-1.5">
                    {totalWeekHours === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-[11px] text-muted-foreground italic">
                          Sem sessões no período.
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis hide />
                          <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                            contentStyle={{
                              fontSize: 10,
                              padding: '4px 8px',
                              background: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: 6,
                            }}
                            formatter={(v: number) => [formatHoursHMS(v), 'Estudado']}
                          />
                          <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 italic">
                    {historyByModule
                      ? 'Horas registradas neste módulo.'
                      : 'Horas do curso (após migração, será por módulo).'}
                  </p>
                </div>

                {/* Notas com auto-save */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Notas</span>
                    </div>
                    <AnimatePresence mode="wait">
                      {saveStatus === 'saving' && (
                        <motion.div
                          key="saving"
                          initial={{ opacity: 0, y: -3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground"
                        >
                          <CloudUpload className="h-3 w-3 animate-pulse" />
                          Salvando…
                        </motion.div>
                      )}
                      {saveStatus === 'saved' && (
                        <motion.div
                          key="saved"
                          initial={{ opacity: 0, y: -3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1 text-[10px] text-emerald-600"
                        >
                          <Check className="h-3 w-3" />
                          Salvo
                        </motion.div>
                      )}
                      {saveStatus === 'error' && (
                        <motion.div
                          key="error"
                          initial={{ opacity: 0, y: -3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-[10px] text-destructive"
                        >
                          Erro ao salvar
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anote insights, dúvidas ou pontos importantes deste módulo…"
                    className="min-h-[80px] text-xs resize-none bg-muted/30 border-muted focus-visible:ring-1"
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Action */}
        <div className="p-3 border-t bg-muted/20">
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={startFocus}
            disabled={isCompleted}
          >
            <Play className="h-4 w-4" />
            {isCompleted ? 'Módulo concluído' : 'Iniciar foco neste módulo'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
