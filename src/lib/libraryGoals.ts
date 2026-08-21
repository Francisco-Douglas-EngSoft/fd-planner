/**
 * Cálculos da Biblioteca (relatórios e metas).
 *
 * Regras simples e únicas, usadas por toda a aba Relatórios:
 *  - Progresso = páginas lidas / total de páginas da biblioteca.
 *  - Meta diária efetiva = manual OU ritmo necessário para cumprir o prazo.
 *  - Meta de um período = meta diária × dias do período (sem outras fórmulas).
 */

export const DAY_MS = 86_400_000;

export interface BookLike {
  total_pages?: number | null;
  last_read_page?: number | null;
  status?: string | null;
}

export const isoDate = (d: Date) => {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  return c.toISOString().slice(0, 10);
};

export const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

const startOfDay = (d: Date) => new Date(d).setHours(0, 0, 0, 0);

/** Dias de calendário entre duas datas, inclusivo (mesmo dia = 1). */
export const daysInclusive = (from: Date, to: Date) =>
  Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS) + 1;

/* ───────────────────────── biblioteca ───────────────────────── */

export interface LibraryTotals {
  count: number;
  total: number;
  read: number;
  remaining: number;
  missing: number;
  pct: number;
}

export function computeLibraryTotals(books: BookLike[]): LibraryTotals {
  let total = 0;
  let read = 0;
  let missing = 0;

  for (const b of books) {
    const pages = b.total_pages ?? 0;
    if (pages <= 0) {
      missing++;
      continue;
    }
    total += pages;
    read +=
      b.status === "completed" ? pages : Math.min(Math.max(b.last_read_page ?? 0, 0), pages);
  }

  const remaining = Math.max(0, total - read);
  return {
    count: books.length,
    total,
    read,
    remaining,
    missing,
    pct: total > 0 ? Math.min(100, Math.round((read / total) * 100)) : 0,
  };
}

/* ───────────────────────── plano com prazo ───────────────────────── */

export interface LibraryPlan {
  valid: boolean;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  /** páginas/dia necessárias para concluir tudo dentro do prazo */
  requiredPerDay: number;
  /** meta diária realmente aplicada (manual ou derivada do prazo) */
  effectiveDailyPages: number;
  /** quanto deveria estar lido hoje para estar no ritmo */
  expectedRead: number;
  /** positivo = adiantado, negativo = atrasado (em páginas) */
  delta: number;
  onPace: boolean;
  /** previsão de conclusão usando a meta diária efetiva */
  finishDate: Date | null;
  overdue: boolean;
}

export function computeLibraryPlan(params: {
  totals: LibraryTotals;
  startISO: string;
  endISO: string;
  dailyPages: number;
  useLibraryPace: boolean;
  today?: Date;
}): LibraryPlan {
  const { totals, startISO, endISO, dailyPages, useLibraryPace } = params;
  const today = params.today ?? new Date();

  const start = new Date(`${startISO}T12:00:00`);
  const end = new Date(`${endISO}T12:00:00`);
  const valid =
    !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && startOfDay(end) >= startOfDay(start);

  const totalDays = valid ? daysInclusive(start, end) : 0;
  const elapsedDays = valid
    ? Math.max(0, Math.min(totalDays, daysInclusive(start, today)))
    : 0;
  // Dias restantes incluem hoje enquanto o prazo não passou.
  const remainingDays = valid ? Math.max(0, totalDays - elapsedDays + (elapsedDays > 0 ? 1 : 0)) : 0;
  const overdue = valid && startOfDay(today) > startOfDay(end);

  const requiredPerDay =
    totals.remaining === 0 ? 0 : remainingDays > 0 ? Math.ceil(totals.remaining / remainingDays) : totals.remaining;

  const effectiveDailyPages =
    useLibraryPace && requiredPerDay > 0 ? requiredPerDay : Math.max(0, dailyPages);

  const expectedRead = totalDays > 0 ? Math.round((totals.total * elapsedDays) / totalDays) : 0;
  const delta = totals.read - expectedRead;

  const finishDate =
    totals.remaining > 0 && effectiveDailyPages > 0
      ? addDays(today, Math.ceil(totals.remaining / effectiveDailyPages))
      : null;

  return {
    valid,
    totalDays,
    elapsedDays,
    remainingDays,
    requiredPerDay,
    effectiveDailyPages,
    expectedRead,
    delta,
    onPace: delta >= 0,
    finishDate,
    overdue,
  };
}

/* ───────────────────────── metas por período ───────────────────────── */

export type PeriodKey = "daily" | "weekly" | "monthly" | "quarterly" | "semiannual" | "annual";

export interface PeriodRange {
  key: PeriodKey;
  label: string;
  from: Date;
  to: Date;
  /** fração de mês do período, usada para a meta de livros */
  months: number;
}

export function periodRanges(today = new Date()): PeriodRange[] {
  const y = today.getFullYear();
  const m = today.getMonth();
  const weekStart = addDays(today, -((today.getDay() + 6) % 7));
  const quarterStart = new Date(y, Math.floor(m / 3) * 3, 1);
  const semesterStart = new Date(y, m < 6 ? 0 : 6, 1);

  return [
    { key: "daily", label: "Hoje", from: today, to: today, months: 1 / 30 },
    { key: "weekly", label: "Semana", from: weekStart, to: addDays(weekStart, 6), months: 7 / 30 },
    { key: "monthly", label: "Mês", from: new Date(y, m, 1), to: new Date(y, m + 1, 0), months: 1 },
    {
      key: "quarterly",
      label: "Trimestre",
      from: quarterStart,
      to: new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0),
      months: 3,
    },
    {
      key: "semiannual",
      label: "Semestre",
      from: semesterStart,
      to: new Date(semesterStart.getFullYear(), semesterStart.getMonth() + 6, 0),
      months: 6,
    },
    { key: "annual", label: "Ano", from: new Date(y, 0, 1), to: new Date(y, 11, 31), months: 12 },
  ];
}

export interface PeriodProgress extends PeriodRange {
  totalDays: number;
  elapsedDays: number;
  pages: number;
  minutes: number;
  pagesGoal: number;
  minutesGoal: number;
  expectedPages: number;
  booksGoal: number;
  pct: number;
  minutesPct: number;
  onPace: boolean;
  missingPages: number;
}

export function computePeriods(params: {
  byDay: Map<string, { pages: number; minutes: number }>;
  dailyPages: number;
  dailyMinutes: number;
  monthlyBooks: number;
  today?: Date;
}): PeriodProgress[] {
  const { byDay, dailyPages, dailyMinutes, monthlyBooks } = params;
  const today = params.today ?? new Date();

  const sumRange = (from: Date, to: Date) => {
    let pages = 0;
    let minutes = 0;
    for (let d = new Date(from); startOfDay(d) <= startOfDay(to); d = addDays(d, 1)) {
      const v = byDay.get(isoDate(d));
      if (v) {
        pages += v.pages;
        minutes += v.minutes;
      }
    }
    return { pages, minutes };
  };

  return periodRanges(today).map((range) => {
    const totalDays = Math.max(1, daysInclusive(range.from, range.to));
    const elapsedDays = Math.max(1, Math.min(totalDays, daysInclusive(range.from, today)));
    const { pages, minutes } = sumRange(range.from, today < range.to ? today : range.to);

    const pagesGoal = dailyPages * totalDays;
    const minutesGoal = dailyMinutes * totalDays;
    const expectedPages = dailyPages * elapsedDays;

    return {
      ...range,
      totalDays,
      elapsedDays,
      pages,
      minutes,
      pagesGoal,
      minutesGoal,
      expectedPages,
      booksGoal: Math.max(1, Math.round(monthlyBooks * range.months)),
      pct: pagesGoal > 0 ? Math.min(100, Math.round((pages / pagesGoal) * 100)) : 0,
      minutesPct: minutesGoal > 0 ? Math.min(100, Math.round((minutes / minutesGoal) * 100)) : 0,
      onPace: pages >= expectedPages,
      missingPages: Math.max(0, expectedPages - pages),
    };
  });
}
