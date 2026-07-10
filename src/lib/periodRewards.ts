/**
 * Recompensas por período — utilitários de cálculo de janelas de tempo,
 * metas de horas padrão e rótulos. Baseline: 20h/semana (Seg–Sáb).
 */

export type PeriodType =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual';

export const PERIOD_ORDER: PeriodType[] = [
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'annual',
];

export const PERIOD_LABELS: Record<PeriodType, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

/** Descrição do período em texto curto */
export const PERIOD_DESCRIPTION: Record<PeriodType, string> = {
  weekly: 'A cada semana (Seg–Sáb)',
  biweekly: 'A cada quinzena (1–15 / 16–fim)',
  monthly: 'A cada mês',
  bimonthly: 'A cada 2 meses',
  quarterly: 'A cada 3 meses',
  semiannual: 'A cada 6 meses',
  annual: 'A cada ano',
};

/** Meta de horas padrão por período (20h por semana). */
export const PERIOD_DEFAULT_HOURS: Record<PeriodType, number> = {
  weekly: 20,
  biweekly: 40,
  monthly: 80,
  bimonthly: 160,
  quarterly: 240,
  semiannual: 480,
  annual: 960,
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Formata uma data como YYYY-MM-DD no fuso local (sem UTC). */
function fmtLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface PeriodRange {
  start: Date;
  /** exclusivo */
  end: Date;
  /** chave única do período, ex.: 2026-W28, 2026-7-Q1, 2026-B2 */
  key: string;
  /** rótulo legível da janela atual */
  label: string;
}

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function getPeriodRange(period: PeriodType, ref: Date = new Date()): PeriodRange {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();

  switch (period) {
    case 'weekly': {
      const day = ref.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = startOfDay(new Date(y, m, d + diff));
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { start, end, key: `${start.getFullYear()}-W${isoWeek(start)}`, label: `Semana ${isoWeek(start)}` };
    }
    case 'biweekly': {
      if (d <= 15) {
        return {
          start: startOfDay(new Date(y, m, 1)),
          end: startOfDay(new Date(y, m, 16)),
          key: `${y}-${m + 1}-Q1`,
          label: `1–15 ${MONTHS[m]}`,
        };
      }
      return {
        start: startOfDay(new Date(y, m, 16)),
        end: startOfDay(new Date(y, m + 1, 1)),
        key: `${y}-${m + 1}-Q2`,
        label: `16–fim ${MONTHS[m]}`,
      };
    }
    case 'monthly':
      return {
        start: startOfDay(new Date(y, m, 1)),
        end: startOfDay(new Date(y, m + 1, 1)),
        key: `${y}-${m + 1}`,
        label: `${MONTHS[m]} ${y}`,
      };
    case 'bimonthly': {
      const block = Math.floor(m / 2);
      return {
        start: startOfDay(new Date(y, block * 2, 1)),
        end: startOfDay(new Date(y, block * 2 + 2, 1)),
        key: `${y}-B${block + 1}`,
        label: `${MONTHS[block * 2]}–${MONTHS[block * 2 + 1]}`,
      };
    }
    case 'quarterly': {
      const block = Math.floor(m / 3);
      return {
        start: startOfDay(new Date(y, block * 3, 1)),
        end: startOfDay(new Date(y, block * 3 + 3, 1)),
        key: `${y}-T${block + 1}`,
        label: `${block + 1}º trimestre`,
      };
    }
    case 'semiannual': {
      const block = Math.floor(m / 6);
      return {
        start: startOfDay(new Date(y, block * 6, 1)),
        end: startOfDay(new Date(y, block * 6 + 6, 1)),
        key: `${y}-S${block + 1}`,
        label: `${block + 1}º semestre`,
      };
    }
    case 'annual':
      return {
        start: startOfDay(new Date(y, 0, 1)),
        end: startOfDay(new Date(y + 1, 0, 1)),
        key: `${y}`,
        label: `${y}`,
      };
  }
}

/** Início do ano de referência — usado para carregar sessões de uma vez. */
export function startOfYear(ref: Date = new Date()): Date {
  return startOfDay(new Date(ref.getFullYear(), 0, 1));
}

export interface FocusLike {
  completed_at: string;
  duration_minutes: number;
}

/** Soma de horas dentro de um intervalo [start, end). */
export function sumHoursInRange(sessions: FocusLike[], start: Date, end: Date): number {
  const s = start.getTime();
  const e = end.getTime();
  let minutes = 0;
  for (const session of sessions) {
    const t = new Date(session.completed_at).getTime();
    if (t >= s && t < e) minutes += session.duration_minutes || 0;
  }
  return minutes / 60;
}
