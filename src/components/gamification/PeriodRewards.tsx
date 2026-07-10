import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift, Plus, Pencil, Trash2, Clock, Check, PartyPopper, Sparkles, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  PeriodType, PERIOD_ORDER, PERIOD_LABELS, PERIOD_DESCRIPTION, PERIOD_DEFAULT_HOURS,
  getPeriodRange, startOfYear, sumHoursInRange,
} from '@/lib/periodRewards';

// Tabelas ainda não presentes em types.ts — acesso destipado.
const db = supabase as unknown as { from: (t: string) => any };

interface RewardGoal {
  id: string;
  period_type: PeriodType;
  title: string;
  notes: string | null;
  target_hours: number;
  emoji: string | null;
}

interface RewardClaim {
  reward_goal_id: string;
  period_key: string;
}

interface FocusRow {
  completed_at: string;
  duration_minutes: number;
}

const EMOJI_OPTIONS = ['🎁', '🍕', '🎮', '📚', '👟', '🎬', '☕', '🍔', '🛍️', '✈️', '💆', '🎧'];

const PERIOD_TINT: Record<PeriodType, string> = {
  weekly: 'tint-blue',
  biweekly: 'tint-cyan',
  monthly: 'tint-violet',
  bimonthly: 'tint-teal',
  quarterly: 'tint-emerald',
  semiannual: 'tint-amber',
  annual: 'tint-orange',
};

interface EditorState {
  open: boolean;
  editing: RewardGoal | null;
  period_type: PeriodType;
  title: string;
  notes: string;
  target_hours: string;
  emoji: string;
}

const emptyEditor = (period: PeriodType = 'weekly'): EditorState => ({
  open: true,
  editing: null,
  period_type: period,
  title: '',
  notes: '',
  target_hours: String(PERIOD_DEFAULT_HOURS[period]),
  emoji: '🎁',
});

export function PeriodRewards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<RewardGoal[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [sessions, setSessions] = useState<FocusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setGoals([]);
      setClaims([]);
      setSessions([]);
      return;
    }
    setLoading(true);
    try {
      const [goalsRes, claimsRes, sessionsRes] = await Promise.all([
        db.from('reward_goals').select('*').eq('user_id', user.id),
        db.from('reward_claims').select('reward_goal_id, period_key').eq('user_id', user.id),
        supabase
          .from('focus_sessions')
          .select('completed_at, duration_minutes')
          .eq('user_id', user.id)
          .eq('session_type', 'work')
          .gte('completed_at', startOfYear().toISOString()),
      ]);
      setGoals((goalsRes.data as RewardGoal[]) || []);
      setClaims((claimsRes.data as RewardClaim[]) || []);
      setSessions((sessionsRes.data as FocusRow[]) || []);
    } catch (err) {
      console.error('Erro ao carregar recompensas:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const computed = useMemo(() => {
    return goals
      .map((goal) => {
        const range = getPeriodRange(goal.period_type);
        const hours = sumHoursInRange(sessions, range.start, range.end);
        const target = goal.target_hours || PERIOD_DEFAULT_HOURS[goal.period_type];
        const percent = target > 0 ? Math.min((hours / target) * 100, 100) : 0;
        const reached = hours >= target;
        const claimed = claims.some(
          (c) => c.reward_goal_id === goal.id && c.period_key === range.key,
        );
        return { goal, range, hours, target, percent, reached, claimed };
      })
      .sort(
        (a, b) =>
          PERIOD_ORDER.indexOf(a.goal.period_type) - PERIOD_ORDER.indexOf(b.goal.period_type),
      );
  }, [goals, sessions, claims]);

  const handleSave = async () => {
    if (!user || !editor) return;
    const title = editor.title.trim();
    if (!title) {
      toast({ title: 'Dê um nome à recompensa', variant: 'destructive' });
      return;
    }
    const payload = {
      user_id: user.id,
      period_type: editor.period_type,
      title,
      notes: editor.notes.trim() || null,
      target_hours: Number(editor.target_hours) || PERIOD_DEFAULT_HOURS[editor.period_type],
      emoji: editor.emoji,
    };
    try {
      if (editor.editing) {
        const { error } = await db.from('reward_goals').update(payload).eq('id', editor.editing.id);
        if (error) throw error;
        toast({ title: 'Recompensa atualizada' });
      } else {
        const { error } = await db.from('reward_goals').insert(payload);
        if (error) throw error;
        toast({ title: 'Recompensa criada 🎁' });
      }
      setEditor(null);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await db.from('reward_goals').delete().eq('id', deleteId);
      if (error) throw error;
      toast({ title: 'Recompensa removida' });
      setDeleteId(null);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  const handleClaim = async (goalId: string, periodKey: string, hours: number) => {
    if (!user) return;
    setClaiming(goalId);
    try {
      const { error } = await db.from('reward_claims').insert({
        user_id: user.id,
        reward_goal_id: goalId,
        period_key: periodKey,
        hours_at_claim: Math.round(hours * 10) / 10,
      });
      if (error && error.code !== '23505') throw error;
      toast({ title: 'Recompensa resgatada! 🎉', description: 'Aproveite — você merece!' });
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao resgatar';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setClaiming(null);
    }
  };

  const openNew = () => setEditor(emptyEditor());
  const openEdit = (goal: RewardGoal) =>
    setEditor({
      open: true,
      editing: goal,
      period_type: goal.period_type,
      title: goal.title,
      notes: goal.notes || '',
      target_hours: String(goal.target_hours),
      emoji: goal.emoji || '🎁',
    });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/25">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display">Recompensas por Período</h3>
            <p className="text-xs text-muted-foreground">
              Metas de horas estudadas — base de 20h/semana. Bata a meta e resgate seu prêmio.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova recompensa
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : computed.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center space-y-3">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <div>
              <p className="font-semibold text-muted-foreground">Nenhuma recompensa criada ainda</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Crie prêmios que você goste (comprar algo novo, comer uma pizza…) para cada período.
              </p>
            </div>
            <Button size="sm" onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" /> Criar primeira recompensa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {computed.map(({ goal, range, hours, target, percent, reached, claimed }, i) => (
              <motion.div
                key={goal.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 220, damping: 22 }}
              >
                <Card className={cn('tint-card h-full relative overflow-hidden', PERIOD_TINT[goal.period_type])}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl leading-none shrink-0">{goal.emoji || '🎁'}</span>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm leading-tight truncate">{goal.title}</h4>
                          <Badge variant="secondary" className="mt-1 text-[10px] gap-1">
                            {PERIOD_LABELS[goal.period_type]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(goal)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(goal.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {goal.notes && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{goal.notes}</p>
                    )}

                    <div className="space-y-1.5">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={cn(
                            'h-full rounded-full',
                            reached ? 'bg-success' : 'bg-gradient-to-r from-primary to-accent',
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {hours.toFixed(1)}h / {target}h
                        </span>
                        <span className="font-mono text-muted-foreground">{Math.round(percent)}%</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70">
                        {PERIOD_DESCRIPTION[goal.period_type]} · {range.label}
                      </p>
                    </div>

                    {claimed ? (
                      <Badge className="w-full justify-center gap-1 bg-success/10 text-success border-success/20 py-1.5">
                        <Check className="h-3.5 w-3.5" /> Resgatada neste período
                      </Badge>
                    ) : reached ? (
                      <Button
                        size="sm"
                        className="w-full gap-1.5 bg-success hover:bg-success/90 text-white"
                        disabled={claiming === goal.id}
                        onClick={() => handleClaim(goal.id, range.key, hours)}
                      >
                        {claiming === goal.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PartyPopper className="h-4 w-4" />
                        )}
                        Resgatar recompensa
                      </Button>
                    ) : (
                      <p className="text-[11px] text-center text-muted-foreground py-1">
                        Faltam {(target - hours).toFixed(1)}h para o prêmio
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Editor */}
      <Dialog open={!!editor} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {editor?.editing ? 'Editar recompensa' : 'Nova recompensa'}
            </DialogTitle>
            <DialogDescription>
              Defina um prêmio que você goste e a meta de horas de estudo do período.
            </DialogDescription>
          </DialogHeader>

          {editor && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Período</Label>
                <Select
                  value={editor.period_type}
                  onValueChange={(v) =>
                    setEditor({
                      ...editor,
                      period_type: v as PeriodType,
                      target_hours: editor.editing
                        ? editor.target_hours
                        : String(PERIOD_DEFAULT_HOURS[v as PeriodType]),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_ORDER.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PERIOD_LABELS[p]} · {PERIOD_DEFAULT_HOURS[p]}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Recompensa</Label>
                <Input
                  placeholder="Ex.: Comer uma pizza, comprar um livro novo…"
                  value={editor.title}
                  maxLength={80}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Emoji</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEditor({ ...editor, emoji: em })}
                      className={cn(
                        'h-9 w-9 rounded-lg text-lg flex items-center justify-center border transition-all',
                        editor.emoji === em
                          ? 'border-primary bg-primary/10 scale-110'
                          : 'border-border hover:bg-muted',
                      )}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Meta de horas do período</Label>
                <Input
                  type="number"
                  min={1}
                  value={editor.target_hours}
                  onChange={(e) => setEditor({ ...editor, target_hours: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Detalhes do prêmio…"
                  value={editor.notes}
                  maxLength={200}
                  rows={2}
                  onChange={(e) => setEditor({ ...editor, notes: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)}>Cancelar</Button>
            <Button onClick={handleSave}>{editor?.editing ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de remoção */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover recompensa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O histórico de resgates também será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
