/**
 * PaceScenarioCard
 * Card de cenário (Mínimo / Ideal / Máximo) com horas/dia,
 * data realista e otimista. Reutilizado no grid (desktop) e
 * carousel (mobile) do CourseScheduleDialog.
 */

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatHoursHMS, type PaceLevel, type PaceProjection } from '@/lib/studyPaceCalculator';

export interface PaceScenarioMeta {
  label: string;
  color: string;
  bg: string;
  ring: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

interface PaceScenarioCardProps {
  level: PaceLevel;
  meta: PaceScenarioMeta;
  projection: PaceProjection;
  index?: number;
}

const formatDate = (d: Date | null): string => {
  if (!d) return '—';
  return format(d, "dd 'de' MMM, yyyy", { locale: ptBR });
};

export function PaceScenarioCard({ level, meta, projection, index = 0 }: PaceScenarioCardProps) {
  const Icon = meta.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="h-full"
    >
      <Card
        className={cn(
          'relative overflow-hidden border-0 ring-1 transition-all md:hover:scale-[1.02] h-full',
          meta.bg,
          meta.ring,
          level === 'ideal' && 'ring-2 shadow-lg shadow-primary/10',
        )}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className={cn('h-4 w-4 shrink-0', meta.color)} />
              <span className={cn('text-sm font-bold truncate', meta.color)}>{meta.label}</span>
            </div>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-5 bg-background/60 shrink-0"
            >
              {meta.tag}
            </Badge>
          </div>

          <div className="text-center py-2 border-y border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Horas por dia
            </p>
            <p className={cn('text-2xl font-bold font-mono', meta.color)}>
              {formatHoursHMS(projection.hoursPerDay)}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2 rounded bg-background/60">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <CalendarCheck className="h-3 w-3" />
                <span className="text-[10px] uppercase">Realista</span>
              </div>
              <p className="font-semibold text-sm">{formatDate(projection.realisticEndDate)}</p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {projection.realisticDays > 0
                  ? `em ${projection.realisticDays} dias corridos`
                  : 'agora'}
              </p>
            </div>
            <div className="p-2 rounded bg-background/60">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <CalendarClock className="h-3 w-3" />
                <span className="text-[10px] uppercase">Otimista</span>
              </div>
              <p className="font-semibold text-sm">{formatDate(projection.optimisticEndDate)}</p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {projection.optimisticDays > 0
                  ? `em ${projection.optimisticDays} dias corridos`
                  : 'agora'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
