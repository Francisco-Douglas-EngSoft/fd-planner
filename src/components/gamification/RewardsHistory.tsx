import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { History, Clock, CalendarCheck, Loader2, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PeriodType, PERIOD_LABELS, periodKeyLabel } from '@/lib/periodRewards';

// Tabelas ainda não presentes em types.ts — acesso destipado.
const db = supabase as unknown as { from: (t: string) => any };

interface ClaimRow {
  id: string;
  period_key: string;
  hours_at_claim: number | null;
  claimed_at: string;
  reward_goals: {
    title: string;
    emoji: string | null;
    period_type: PeriodType;
    target_hours: number;
  } | null;
}

export function RewardsHistory() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setClaims([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await db
        .from('reward_claims')
        .select('id, period_key, hours_at_claim, claimed_at, reward_goals(title, emoji, period_type, target_hours)')
        .eq('user_id', user.id)
        .order('claimed_at', { ascending: false });
      setClaims((data as ClaimRow[]) || []);
    } catch (err) {
      console.error('Erro ao carregar histórico de recompensas:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/25">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold font-display">Recompensas Resgatadas</h3>
          <p className="text-xs text-muted-foreground">
            Seu histórico de prêmios conquistados por período, com data e horas que contribuíram.
          </p>
        </div>
      </div>

      {claims.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center space-y-2">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <p className="font-semibold text-muted-foreground">Nenhuma recompensa resgatada ainda</p>
            <p className="text-sm text-muted-foreground/70">
              Bata as metas de horas e resgate seus prêmios — eles aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {claims.map((claim, i) => {
            const goal = claim.reward_goals;
            const periodType = goal?.period_type ?? 'weekly';
            return (
              <motion.div
                key={claim.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="h-full border-success/20 bg-success/[0.03]">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl leading-none shrink-0">{goal?.emoji || '🎁'}</span>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm leading-tight truncate">
                          {goal?.title || 'Recompensa'}
                        </h4>
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          {PERIOD_LABELS[periodType]}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {periodKeyLabel(periodType, claim.period_key)}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="h-3.5 w-3.5 text-success" />
                        {new Date(claim.claimed_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </span>
                      {claim.hours_at_claim != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {claim.hours_at_claim}h
                          {goal?.target_hours ? ` / ${goal.target_hours}h` : ''}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
