/**
 * Agenda de módulos do Foco: a partir dos planos "Por Módulo" salvos e do tempo
 * já estudado em cada módulo, monta o que estudar hoje (minutos planejados,
 * quanto já foi feito hoje e quanto falta), os módulos que já atingiram as horas
 * previstas (prontos para concluir) e o próximo dia de estudo quando hoje é livre.
 *
 * Regra principal: o plano de hoje é calculado descontando só o tempo estudado
 * ANTES de hoje — assim estudar hoje preenche a meta do dia em vez de mudá-la.
 */
import { addDays, format, isValid, parseISO, startOfDay } from 'date-fns';
import { buildModuleSchedule, type TimeSlotId } from './moduleSchedule';
import { isModulePlan, planToScheduleInput, type ModulePlanLike } from './modulePlanAdapter';

export interface FocusAgendaPlan extends ModulePlanLike {
  id: string;
  name: string;
  end_date: string;
  no_deadline?: boolean | null;
}

export interface StudiedMinutes {
  /** Minutos por módulo (id de course_modules) antes de hoje. */
  beforeToday: Record<string, number>;
  /** Minutos por módulo (id de course_modules) hoje. */
  today: Record<string, number>;
}

export interface FocusModuleItem {
  key: string;
  planId: string;
  planName: string;
  /** id do módulo do curso (course_modules); null quando o plano guardou só o nome. */
  moduleId: string | null;
  moduleName: string;
  courseId: string | null;
  courseName: string;
  timeSlot: TimeSlotId | null;
  plannedMinutes: number;
  studiedTodayMinutes: number;
  remainingTodayMinutes: number;
  todayDone: boolean;
  moduleMinutes: number;
  studiedTotalMinutes: number;
  /** 0–100 das horas previstas do módulo. */
  moduleProgressPct: number;
  /** Já estudou as horas previstas, falta só marcar como concluído. */
  readyToComplete: boolean;
}

export interface FocusNextStudy {
  planId: string;
  planName: string;
  date: string;
  moduleName: string;
  courseName: string;
  minutes: number;
}

export interface FocusModuleAgenda {
  items: FocusModuleItem[];
  /** Módulos não concluídos que já atingiram as horas previstas e não estão em `items`. */
  awaitingCompletion: FocusModuleItem[];
  /** Próximo estudo dos planos sem nada para hoje. */
  next: FocusNextStudy[];
  plannedTodayMinutes: number;
  studiedTodayMinutes: number;
  /** Quantos planos "Por Módulo" ativos foram considerados. */
  activePlans: number;
}

const SLOT_ORDER: Record<string, number> = { morning: 0, afternoon: 1, evening: 2 };
const EPS = 0.5;

/** Plano ainda vale hoje: sem prazo ou com fim em hoje ou depois. */
function isPlanOpen(plan: FocusAgendaPlan, today: Date): boolean {
  if (plan.no_deadline) return true;
  const end = parseISO(plan.end_date);
  if (!isValid(end)) return true;
  return startOfDay(today) <= startOfDay(end);
}

export function buildFocusModuleAgenda(
  plans: FocusAgendaPlan[],
  studied: StudiedMinutes,
  today: Date = new Date(),
): FocusModuleAgenda {
  const todayKey = format(today, 'yyyy-MM-dd');
  const items: FocusModuleItem[] = [];
  const awaiting: FocusModuleItem[] = [];
  const next: FocusNextStudy[] = [];
  let activePlans = 0;

  for (const plan of plans) {
    if (!isModulePlan(plan) || !isPlanOpen(plan, today)) continue;
    const input = planToScheduleInput(plan, today);
    if (!input) continue;

    const rows = plan.study_plan_modules ?? [];
    const realIdByEngineId = new Map<string, string | null>();
    const rowByEngineId = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      const engineId = r.module_id || r.id;
      realIdByEngineId.set(engineId, r.module_id || null);
      rowByEngineId.set(engineId, r);
    }

    const pending = input.modules.filter((m) => !m.done);
    if (pending.length === 0) continue;
    activePlans += 1;

    const fullMinutes = new Map(input.modules.map((m) => [m.id, Math.max(0, m.hours) * 60]));
    const studiedOf = (id: string, bucket: Record<string, number>) => {
      const real = realIdByEngineId.get(id);
      return real ? bucket[real] ?? 0 : 0;
    };

    // Desconta o que já foi estudado antes de hoje.
    const modules = input.modules.map((m) => {
      if (m.done) return m;
      const before = studiedOf(m.id, studied.beforeToday);
      return { ...m, hours: Math.max(0, m.hours - before / 60) };
    });

    const result = buildModuleSchedule(modules, { ...input.options, maxDays: 400 });
    const byId = new Map(modules.map((m) => [m.id, m]));
    const scheduledToday = result.days.find((d) => d.date === todayKey);
    const todayIds = new Set<string>();

    const makeItem = (engineId: string, plannedMinutes: number): FocusModuleItem => {
      const m = byId.get(engineId)!;
      const row = rowByEngineId.get(engineId);
      const lane = input.options.lanes?.[m.courseId];
      const realId = realIdByEngineId.get(engineId) ?? null;
      const studiedToday = studiedOf(engineId, studied.today);
      const studiedTotal = studiedOf(engineId, studied.beforeToday) + studiedToday;
      const moduleMinutes = fullMinutes.get(engineId) ?? 0;
      const planned = Math.round(plannedMinutes);
      return {
        key: `${plan.id}:${engineId}`,
        planId: plan.id,
        planName: plan.name,
        moduleId: realId,
        moduleName: m.name,
        courseId: row?.course_id ?? null,
        courseName: m.courseName,
        timeSlot: (input.mode === 'weekly' ? lane?.timeSlot : null) ?? null,
        plannedMinutes: planned,
        studiedTodayMinutes: Math.round(studiedToday),
        remainingTodayMinutes: Math.max(0, Math.round(planned - studiedToday)),
        todayDone: planned > 0 && studiedToday + EPS >= planned,
        moduleMinutes: Math.round(moduleMinutes),
        studiedTotalMinutes: Math.round(studiedTotal),
        moduleProgressPct: moduleMinutes > 0 ? Math.min(100, Math.round((studiedTotal / moduleMinutes) * 100)) : 0,
        readyToComplete: Boolean(realId) && moduleMinutes > 0 && studiedTotal + EPS >= moduleMinutes,
      };
    };

    for (const it of scheduledToday?.items ?? []) {
      todayIds.add(it.moduleId);
      items.push(makeItem(it.moduleId, it.minutes));
    }

    // Módulos que já bateram as horas antes de hoje saem da simulação; mostramos para concluir.
    for (const m of modules) {
      if (m.done || todayIds.has(m.id) || !realIdByEngineId.get(m.id)) continue;
      const item = makeItem(m.id, 0);
      if (item.readyToComplete) awaiting.push(item);
    }

    if (!scheduledToday) {
      const first = result.days.find((d) => d.date > todayKey);
      if (first && first.items.length) {
        const m = byId.get(first.items[0].moduleId);
        next.push({
          planId: plan.id,
          planName: plan.name,
          date: first.date,
          moduleName: m?.name ?? 'Módulo',
          courseName: m?.courseName ?? 'Curso',
          minutes: Math.round(first.totalMinutes),
        });
      }
    }
  }

  items.sort((a, b) => {
    const sa = a.timeSlot ? SLOT_ORDER[a.timeSlot] : 3;
    const sb = b.timeSlot ? SLOT_ORDER[b.timeSlot] : 3;
    if (sa !== sb) return sa - sb;
    return 0;
  });
  next.sort((a, b) => a.date.localeCompare(b.date));

  return {
    items,
    awaitingCompletion: awaiting,
    next,
    plannedTodayMinutes: items.reduce((s, i) => s + i.plannedMinutes, 0),
    studiedTodayMinutes: items.reduce((s, i) => s + Math.min(i.studiedTodayMinutes, i.plannedMinutes), 0),
    activePlans,
  };
}

/** Duração sugerida ao iniciar pelo Foco: o que falta hoje, ou uma sessão extra. */
export function suggestedSessionMinutes(item: Pick<FocusModuleItem, 'remainingTodayMinutes' | 'moduleMinutes' | 'studiedTotalMinutes'>, extraMinutes = 25): number {
  if (item.remainingTodayMinutes > 0) return Math.max(5, item.remainingTodayMinutes);
  const leftInModule = item.moduleMinutes - item.studiedTotalMinutes;
  if (leftInModule > 0) return Math.max(5, Math.min(extraMinutes, Math.round(leftInModule)));
  return extraMinutes;
}

/** Soma minutos por módulo separando antes de hoje / hoje. */
export function splitStudiedMinutes(
  sessions: { module_id: string | null; duration_minutes: number | null; completed_at: string }[],
  today: Date = new Date(),
): StudiedMinutes {
  const start = startOfDay(today).getTime();
  const end = addDays(startOfDay(today), 1).getTime();
  const out: StudiedMinutes = { beforeToday: {}, today: {} };
  for (const s of sessions) {
    if (!s.module_id) continue;
    const t = new Date(s.completed_at).getTime();
    if (Number.isNaN(t) || t >= end) continue;
    const bucket = t >= start ? out.today : out.beforeToday;
    bucket[s.module_id] = (bucket[s.module_id] ?? 0) + (Number(s.duration_minutes) || 0);
  }
  return out;
}
