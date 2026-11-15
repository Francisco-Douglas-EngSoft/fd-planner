/**
 * Previsão de leitura da Biblioteca.
 *
 * Regras:
 *  - Fila: livros em leitura primeiro (mais recentes antes), depois "para ler" na ordem em que
 *    foram adicionados. Concluídos ficam no histórico; livros sem total de páginas ficam de fora.
 *  - Cada dia tem a capacidade da meta diária de páginas; um livro começa no mesmo dia em que o
 *    anterior termina se ainda sobrar capacidade nesse dia.
 *  - Tempo estimado usa a velocidade implícita das metas: páginas/dia ÷ minutos/dia.
 *  - Períodos da previsão são janelas a partir do início do plano: 7, 30, 90, 182 e 365 dias.
 */
import { addDays, daysInclusive, isoDate } from "@/lib/libraryGoals";

export interface ForecastBookInput {
  id: string;
  title: string;
  author?: string | null;
  total_pages?: number | null;
  last_read_page?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type ScheduleStatus = "completed" | "reading" | "queued" | "no_pages";

export interface ScheduledBook {
  id: string;
  title: string;
  author: string | null;
  status: ScheduleStatus;
  /** posição na fila (1 = próximo); null para concluídos/sem páginas */
  order: number | null;
  totalPages: number;
  readPages: number;
  remainingPages: number;
  progressPct: number;
  /** quando começou (real) ou quando vai começar (previsto) */
  start: Date | null;
  startIsProjected: boolean;
  /** quando terminou (real) ou prazo previsto para concluir */
  end: Date | null;
  endIsProjected: boolean;
  /** dias de calendário entre início e fim (inclusivo) */
  days: number | null;
  /** minutos estimados para ler o que falta */
  estimatedMinutes: number;
  /** termina até o prazo final do plano? null quando não se aplica */
  withinDeadline: boolean | null;
}

const at12 = (iso: string) => new Date(`${iso}T12:00:00`);
const validDate = (d: Date) => !Number.isNaN(d.getTime());
const day0 = (d: Date) => {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  return c;
};

function isReading(b: ForecastBookInput) {
  return b.status === "reading" || ((b.last_read_page ?? 0) > 0 && b.status !== "completed");
}

function parseTs(ts?: string | null): Date | null {
  if (!ts) return null;
  const d = new Date(ts);
  return validDate(d) ? day0(d) : null;
}

export function buildReadingSchedule(params: {
  books: ForecastBookInput[];
  dailyPages: number;
  dailyMinutes: number;
  /** data em que o plano começa (YYYY-MM-DD); se já passou, a previsão parte de hoje */
  startISO: string;
  /** prazo final do plano (YYYY-MM-DD) */
  deadlineISO?: string | null;
  /** primeira data de leitura registrada por livro (YYYY-MM-DD) */
  firstReadByBook?: Map<string, string>;
  today?: Date;
}): ScheduledBook[] {
  const today = day0(params.today ?? new Date());
  const dailyPages = Math.max(0, Math.floor(params.dailyPages || 0));
  const dailyMinutes = Math.max(0, params.dailyMinutes || 0);
  const minutesPerPage = dailyPages > 0 ? dailyMinutes / dailyPages : 0;
  const planStart = at12(params.startISO);
  const cursorStart = validDate(planStart) && planStart > today ? planStart : today;
  const deadline = params.deadlineISO ? at12(params.deadlineISO) : null;
  const deadlineOk = deadline && validDate(deadline) ? deadline : null;
  const firstRead = params.firstReadByBook ?? new Map<string, string>();

  const base = (b: ForecastBookInput) => {
    const total = Math.max(0, b.total_pages ?? 0);
    const read = b.status === "completed" ? total : Math.min(Math.max(b.last_read_page ?? 0, 0), total);
    return { total, read, remaining: Math.max(0, total - read) };
  };

  const completed: ScheduledBook[] = [];
  const noPages: ScheduledBook[] = [];
  const reading: ForecastBookInput[] = [];
  const queued: ForecastBookInput[] = [];

  for (const b of params.books) {
    const { total, read } = base(b);
    if (b.status === "completed") {
      const end = parseTs(b.updated_at);
      const fr = firstRead.get(b.id);
      const start = fr ? at12(fr) : parseTs(b.created_at);
      completed.push({
        id: b.id,
        title: b.title,
        author: b.author ?? null,
        status: "completed",
        order: null,
        totalPages: total,
        readPages: read,
        remainingPages: 0,
        progressPct: 100,
        start,
        startIsProjected: false,
        end,
        endIsProjected: false,
        days: start && end && end >= start ? daysInclusive(start, end) : null,
        estimatedMinutes: 0,
        withinDeadline: null,
      });
      continue;
    }
    if (total <= 0) {
      noPages.push({
        id: b.id,
        title: b.title,
        author: b.author ?? null,
        status: "no_pages",
        order: null,
        totalPages: 0,
        readPages: Math.max(0, b.last_read_page ?? 0),
        remainingPages: 0,
        progressPct: 0,
        start: null,
        startIsProjected: false,
        end: null,
        endIsProjected: false,
        days: null,
        estimatedMinutes: 0,
        withinDeadline: null,
      });
      continue;
    }
    (isReading(b) ? reading : queued).push(b);
  }

  const ts = (s?: string | null) => (s ? new Date(s).getTime() || 0 : 0);
  reading.sort((a, b) => ts(b.updated_at) - ts(a.updated_at));
  queued.sort((a, b) => ts(a.created_at) - ts(b.created_at));

  // Simulação dia a dia (em blocos): offset = dia atual a partir de cursorStart; cap = páginas livres nesse dia.
  let offset = 0;
  let cap = dailyPages;
  const scheduled: ScheduledBook[] = [];

  [...reading, ...queued].forEach((b, i) => {
    const { total, read, remaining } = base(b);
    const isRd = isReading(b);
    let start: Date | null = null;
    let end: Date | null = null;

    if (dailyPages > 0) {
      if (cap === 0) {
        offset += 1;
        cap = dailyPages;
      }
      const startOffset = offset;
      if (remaining <= cap) {
        cap -= remaining;
      } else {
        const rest = remaining - cap;
        const extraDays = Math.ceil(rest / dailyPages);
        offset += extraDays;
        cap = dailyPages * extraDays - rest;
      }
      start = addDays(cursorStart, startOffset);
      end = addDays(cursorStart, offset);
    }

    const fr = firstRead.get(b.id);
    const realStart = isRd && fr ? at12(fr) : null;
    const shownStart = realStart ?? start;

    scheduled.push({
      id: b.id,
      title: b.title,
      author: b.author ?? null,
      status: isRd ? "reading" : "queued",
      order: i + 1,
      totalPages: total,
      readPages: read,
      remainingPages: remaining,
      progressPct: total > 0 ? Math.min(100, Math.round((read / total) * 100)) : 0,
      start: shownStart,
      startIsProjected: !realStart,
      end,
      endIsProjected: true,
      days: shownStart && end ? daysInclusive(shownStart, end) : null,
      estimatedMinutes: Math.round(remaining * minutesPerPage),
      withinDeadline: end && deadlineOk ? end <= deadlineOk : null,
    });
  });

  completed.sort((a, b) => (b.end?.getTime() ?? 0) - (a.end?.getTime() ?? 0));
  return [...scheduled, ...completed, ...noPages];
}

/* ───────────────────────── previsão por período ───────────────────────── */

export type ForecastKey = "week" | "month" | "quarter" | "semester" | "year";

export const FORECAST_WINDOWS: { key: ForecastKey; label: string; days: number }[] = [
  { key: "week", label: "Semana", days: 7 },
  { key: "month", label: "Mês", days: 30 },
  { key: "quarter", label: "Trimestre", days: 90 },
  { key: "semester", label: "Semestre", days: 182 },
  { key: "year", label: "Ano", days: 365 },
];

export interface PeriodForecast {
  key: ForecastKey;
  label: string;
  days: number;
  from: Date;
  to: Date;
  pages: number;
  minutes: number;
  /** livros da fila que terminam dentro da janela */
  booksFinished: number;
  titles: string[];
  /** quantos livros de tamanho médio cabem nas páginas do período */
  capacityBooks: number;
}

export function forecastPeriods(params: {
  schedule: ScheduledBook[];
  dailyPages: number;
  dailyMinutes: number;
  startISO: string;
  /** média de páginas por livro; quando ausente, usa a média da própria biblioteca */
  avgPages?: number;
  today?: Date;
}): PeriodForecast[] {
  const today = day0(params.today ?? new Date());
  const planStart = at12(params.startISO);
  const from = validDate(planStart) && planStart > today ? planStart : today;
  const dailyPages = Math.max(0, Math.floor(params.dailyPages || 0));
  const dailyMinutes = Math.max(0, params.dailyMinutes || 0);

  const sized = params.schedule.filter((b) => b.totalPages > 0);
  const avg =
    params.avgPages ??
    (sized.length ? sized.reduce((a, b) => a + b.totalPages, 0) / sized.length : 0);
  const queue = params.schedule.filter((b) => b.status === "reading" || b.status === "queued");

  return FORECAST_WINDOWS.map((w) => {
    const to = addDays(from, w.days - 1);
    const done = queue.filter((b) => b.end && isoDate(b.end) <= isoDate(to));
    const pages = dailyPages * w.days;
    return {
      ...w,
      from,
      to,
      pages,
      minutes: dailyMinutes * w.days,
      booksFinished: done.length,
      titles: done.map((b) => b.title),
      capacityBooks: avg > 0 ? Math.floor((pages / avg) * 10) / 10 : 0,
    };
  });
}

/** Primeira data com leitura registrada, por livro. */
export function firstReadDates(sessions: { book_id: string; date: string }[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of sessions) {
    const cur = m.get(s.book_id);
    if (!cur || s.date < cur) m.set(s.book_id, s.date);
  }
  return m;
}

export function formatMinutes(min: number): string {
  if (min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}
