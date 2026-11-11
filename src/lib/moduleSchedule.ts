/**
 * Motor da grade semanal para planejamentos "Por Módulo".
 *
 * Regras (puras, sem acesso a dados):
 * - Modo "sequence" (Em sequência): um módulo por vez, na ordem de execução,
 *   usando toda a meta diária. Quando um módulo termina no meio do dia, o
 *   tempo que sobra já começa o próximo.
 * - Modo "weekly" (Por dias da semana): cada curso é uma "trilha" estudada só
 *   nos dias escolhidos para ele. Dentro da trilha os módulos seguem em ordem.
 *   No dia, trilhas com tempo fixo por sessão recebem esse tempo primeiro; o
 *   restante da meta diária é dividido igualmente entre as demais trilhas do dia.
 *   Se uma trilha termina no meio do dia, a sobra vai para as outras trilhas
 *   flexíveis daquele dia.
 * - Dias fora dos dias de estudo do plano nunca recebem estudo.
 */
import { addDays, format, startOfDay } from 'date-fns';

/** Índice = Date.getDay() (0 = domingo). */
export const WEEKDAY_IDS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
export type WeekdayId = (typeof WEEKDAY_IDS)[number];

/** Ordem de exibição (segunda → domingo). */
export const WEEK_ORDER: WeekdayId[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const WEEKDAY_LABELS: Record<WeekdayId, { short: string; long: string }> = {
  monday: { short: 'Seg', long: 'Segunda' },
  tuesday: { short: 'Ter', long: 'Terça' },
  wednesday: { short: 'Qua', long: 'Quarta' },
  thursday: { short: 'Qui', long: 'Quinta' },
  friday: { short: 'Sex', long: 'Sexta' },
  saturday: { short: 'Sáb', long: 'Sábado' },
  sunday: { short: 'Dom', long: 'Domingo' },
};

export type ModulePlanMode = 'weekly' | 'sequence';
export type TimeSlotId = 'morning' | 'afternoon' | 'evening';

export interface ScheduleModule {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  hours: number;
  order: number;
  done?: boolean;
}

export interface LaneSetting {
  /** Dias da semana da trilha. `undefined` = todos os dias de estudo do plano. */
  days?: string[];
  /** Tempo fixo por sessão (horas). Vazio = divide a meta diária. */
  sessionHours?: number | null;
  timeSlot?: TimeSlotId | null;
}

export interface ScheduleOptions {
  startDate: Date;
  studyDays: string[];
  dailyHours: number;
  mode: ModulePlanMode;
  lanes?: Record<string, LaneSetting>;
  /** Limite de dias simulados (padrão: 10 anos). */
  maxDays?: number;
}

export interface ScheduledItem {
  moduleId: string;
  courseId: string;
  minutes: number;
}

export interface ScheduledDay {
  date: string;
  dayId: WeekdayId;
  items: ScheduledItem[];
  totalMinutes: number;
}

export interface ModuleProjection {
  start: string | null;
  end: string | null;
  sessions: number;
}

export interface ModuleScheduleResult {
  days: ScheduledDay[];
  projections: Record<string, ModuleProjection>;
  /** Data em que o último módulo termina; null se algum módulo não cabe na grade. */
  finishDate: string | null;
  unscheduledModuleIds: string[];
}

export interface WeeklyTemplateEntry {
  laneId: string;
  courseId: string;
  courseName: string;
  minutes: number;
  isFixed: boolean;
  timeSlot: TimeSlotId | null;
}

const EPS = 1e-6;
const isWeekday = (d: string): d is WeekdayId => (WEEKDAY_IDS as readonly string[]).includes(d);

/** Salva os dias de uma trilha em texto: "monday,wednesday". */
export function encodeLaneDays(days: string[] | undefined | null): string | null {
  if (!days) return null;
  const ordered = WEEK_ORDER.filter((d) => days.includes(d));
  return ordered.length ? ordered.join(',') : null;
}

export function decodeLaneDays(value: string | null | undefined): string[] {
  if (!value) return [];
  return WEEK_ORDER.filter((d) =>
    value
      .split(',')
      .map((s) => s.trim())
      .includes(d),
  );
}

interface Lane {
  id: string;
  courseId: string;
  courseName: string;
  days: WeekdayId[];
  sessionMinutes: number;
  timeSlot: TimeSlotId | null;
  queue: { id: string; remaining: number }[];
}

function buildLanes(modules: ScheduleModule[], options: ScheduleOptions): Lane[] {
  const studyDays = options.studyDays.filter(isWeekday);
  const sorted = [...modules].sort((a, b) => a.order - b.order);

  if (options.mode === 'sequence') {
    return [
      {
        id: 'sequence',
        courseId: 'sequence',
        courseName: 'Sequência',
        days: studyDays,
        sessionMinutes: 0,
        timeSlot: null,
        queue: sorted.map((m) => ({ id: m.id, remaining: m.done ? 0 : Math.max(0, m.hours) * 60 })),
      },
    ];
  }

  const lanes = new Map<string, Lane>();
  for (const m of sorted) {
    let lane = lanes.get(m.courseId);
    if (!lane) {
      const setting = options.lanes?.[m.courseId];
      const days = setting?.days === undefined
        ? studyDays
        : studyDays.filter((d) => setting.days!.includes(d));
      lane = {
        id: m.courseId,
        courseId: m.courseId,
        courseName: m.courseName,
        days,
        sessionMinutes: Math.max(0, (setting?.sessionHours ?? 0) * 60),
        timeSlot: setting?.timeSlot ?? null,
        queue: [],
      };
      lanes.set(m.courseId, lane);
    }
    lane.queue.push({ id: m.id, remaining: m.done ? 0 : Math.max(0, m.hours) * 60 });
  }
  return Array.from(lanes.values());
}

const laneRemaining = (lane: Lane) => lane.queue.reduce((s, q) => s + q.remaining, 0);

/** Divide os minutos de um dia entre as trilhas ativas (fixas primeiro). */
function splitDay(active: Lane[], budgetMinutes: number): Map<string, number> {
  const alloc = new Map<string, number>();
  const fixed = active.filter((l) => l.sessionMinutes > 0);
  const flexible = active.filter((l) => l.sessionMinutes <= 0);
  let fixedSum = 0;
  for (const l of fixed) {
    alloc.set(l.id, l.sessionMinutes);
    fixedSum += l.sessionMinutes;
  }
  const rest = Math.max(0, budgetMinutes - fixedSum);
  const share = flexible.length ? rest / flexible.length : 0;
  for (const l of flexible) alloc.set(l.id, share);
  return alloc;
}

/** Grade "típica" da semana: quanto cada curso recebe em cada dia. */
export function buildWeeklyTemplate(
  modules: ScheduleModule[],
  options: ScheduleOptions,
): Record<WeekdayId, WeeklyTemplateEntry[]> {
  const lanes = buildLanes(modules, options).filter((l) => laneRemaining(l) > EPS);
  const budget = Math.max(0, options.dailyHours) * 60;
  const out = {} as Record<WeekdayId, WeeklyTemplateEntry[]>;
  for (const day of WEEK_ORDER) {
    const active = lanes.filter((l) => l.days.includes(day));
    const alloc = splitDay(active, budget);
    out[day] = active
      .map((l) => ({
        laneId: l.id,
        courseId: l.courseId,
        courseName: l.courseName,
        minutes: alloc.get(l.id) ?? 0,
        isFixed: l.sessionMinutes > 0,
        timeSlot: l.timeSlot,
      }))
      .filter((e) => e.minutes > EPS);
  }
  return out;
}

export function buildModuleSchedule(
  modules: ScheduleModule[],
  options: ScheduleOptions,
): ModuleScheduleResult {
  const lanes = buildLanes(modules, options);
  const budget = Math.max(0, options.dailyHours) * 60;
  const maxDays = options.maxDays ?? 3650;
  const projections: Record<string, ModuleProjection> = {};
  for (const m of modules) projections[m.id] = { start: null, end: null, sessions: 0 };

  const days: ScheduledDay[] = [];
  const canProgress = (l: Lane) => l.days.length > 0 && (l.sessionMinutes > 0 || budget > 0);
  let date = startOfDay(options.startDate);

  for (let i = 0; i < maxDays; i++, date = addDays(date, 1)) {
    const pending = lanes.filter((l) => laneRemaining(l) > EPS && canProgress(l));
    if (pending.length === 0) break;

    const dayId = WEEKDAY_IDS[date.getDay()];
    const active = pending.filter((l) => l.days.includes(dayId));
    if (active.length === 0) continue;

    const dateKey = format(date, 'yyyy-MM-dd');
    const alloc = splitDay(active, budget);
    const used = new Map<string, number>();
    const items = new Map<string, ScheduledItem>();

    const consume = (lane: Lane, minutes: number) => {
      let left = minutes;
      for (const q of lane.queue) {
        if (left <= EPS) break;
        if (q.remaining <= EPS) continue;
        const take = Math.min(q.remaining, left);
        q.remaining -= take;
        left -= take;
        const prev = items.get(q.id);
        items.set(q.id, { moduleId: q.id, courseId: lane.courseId, minutes: (prev?.minutes ?? 0) + take });
        const proj = projections[q.id];
        if (proj) {
          if (!proj.start) proj.start = dateKey;
          if (!prev) proj.sessions += 1;
          if (q.remaining <= EPS) {
            q.remaining = 0;
            proj.end = dateKey;
          }
        }
      }
      used.set(lane.id, (used.get(lane.id) ?? 0) + (minutes - left));
      return minutes - left;
    };

    let leftover = 0;
    for (const lane of active) {
      const want = alloc.get(lane.id) ?? 0;
      const got = consume(lane, want);
      leftover += want - got;
    }
    // Sobra de trilhas que terminaram hoje vai para as trilhas flexíveis do dia.
    for (let pass = 0; pass < active.length && leftover > EPS; pass++) {
      const receivers = active.filter((l) => l.sessionMinutes <= 0 && laneRemaining(l) > EPS);
      if (receivers.length === 0) break;
      const share = leftover / receivers.length;
      leftover = 0;
      for (const lane of receivers) leftover += share - consume(lane, share);
    }

    const list = Array.from(items.values()).filter((it) => it.minutes > EPS);
    if (list.length) {
      days.push({
        date: dateKey,
        dayId,
        items: list,
        totalMinutes: list.reduce((s, it) => s + it.minutes, 0),
      });
    }
  }

  const unscheduledModuleIds = lanes.flatMap((l) =>
    l.queue.filter((q) => q.remaining > EPS).map((q) => q.id),
  );
  let finishDate: string | null = null;
  if (unscheduledModuleIds.length === 0) {
    for (const p of Object.values(projections)) {
      if (p.end && (!finishDate || p.end > finishDate)) finishDate = p.end;
    }
  }
  return { days, projections, finishDate, unscheduledModuleIds };
}

/**
 * Sugere os dias de cada curso, proporcional às horas de cada um e espalhando
 * os dias ao longo da semana. Com mais cursos que dias, cada curso recebe um
 * dia e os dias são compartilhados.
 */
export function suggestLaneDays(
  lanes: { courseId: string; hours: number }[],
  studyDays: string[],
): Record<string, WeekdayId[]> {
  const days = WEEK_ORDER.filter((d) => studyDays.includes(d));
  const result: Record<string, WeekdayId[]> = {};
  if (lanes.length === 0 || days.length === 0) {
    for (const l of lanes) result[l.courseId] = [];
    return result;
  }
  const byHours = [...lanes].sort((a, b) => b.hours - a.hours);

  if (lanes.length >= days.length) {
    byHours.forEach((l, i) => {
      result[l.courseId] = [days[i % days.length]];
    });
    return result;
  }

  const quota = new Map<string, number>(byHours.map((l) => [l.courseId, 1]));
  for (let slot = lanes.length; slot < days.length; slot++) {
    let best = byHours[0];
    let bestScore = -Infinity;
    for (const l of byHours) {
      const score = Math.max(l.hours, EPS) / ((quota.get(l.courseId) ?? 0) + 1);
      if (score > bestScore + EPS) {
        bestScore = score;
        best = l;
      }
    }
    quota.set(best.courseId, (quota.get(best.courseId) ?? 0) + 1);
  }

  for (const l of byHours) result[l.courseId] = [];
  let cursor = 0;
  for (const day of days) {
    for (let tries = 0; tries < byHours.length; tries++) {
      const lane = byHours[(cursor + tries) % byHours.length];
      if ((result[lane.courseId].length) < (quota.get(lane.courseId) ?? 0)) {
        result[lane.courseId].push(day);
        cursor = (cursor + tries + 1) % byHours.length;
        break;
      }
    }
  }
  return result;
}

export function formatMinutesShort(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}
