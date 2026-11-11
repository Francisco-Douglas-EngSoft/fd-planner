/**
 * Converte um planejamento "Por Módulo" salvo (linhas de study_plan_modules)
 * na entrada do motor da grade semanal (`moduleSchedule.ts`).
 */
import { isValid, parseISO, startOfDay } from 'date-fns';
import {
  decodeLaneDays,
  type LaneSetting,
  type ModulePlanMode,
  type ScheduleModule,
  type ScheduleOptions,
  type TimeSlotId,
} from './moduleSchedule';

export interface PlanModuleRow {
  id: string;
  module_id: string | null;
  course_id: string | null;
  module_name: string | null;
  module_hours: number | null;
  allocated_hours: number | null;
  sequence_order: number | null;
  is_completed: boolean | null;
  day_id: string | null;
  daily_hours: number | null;
  time_slot: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  /** Preenchido na leitura (nome do curso do módulo). */
  course_name?: string | null;
}

export interface ModulePlanLike {
  planning_type?: string | null;
  start_date: string;
  daily_hours: number | null;
  study_days: string[] | null;
  study_plan_modules?: PlanModuleRow[] | null;
}

export const PLAN_MODULES_SELECT =
  'study_plan_modules (id, module_id, course_id, module_name, module_hours, allocated_hours, sequence_order, is_completed, day_id, daily_hours, time_slot, planned_start_date, planned_end_date)';

export const isModulePlan = (plan: ModulePlanLike) =>
  plan.planning_type === 'module' && (plan.study_plan_modules?.length ?? 0) > 0;

export function modulePlanMode(rows: PlanModuleRow[]): ModulePlanMode {
  return rows.some((r) => r.day_id) ? 'weekly' : 'sequence';
}

/**
 * @param from  simula a partir desta data quando ela for depois do início do plano
 *              (ex.: hoje, para projetar o que falta).
 */
export function planToScheduleInput(
  plan: ModulePlanLike,
  from?: Date,
): { modules: ScheduleModule[]; options: ScheduleOptions; mode: ModulePlanMode } | null {
  const rows = plan.study_plan_modules ?? [];
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
  const mode = modulePlanMode(sorted);

  const lanes: Record<string, LaneSetting> = {};
  const modules: ScheduleModule[] = sorted.map((r, i) => {
    const courseId = r.course_id || 'sem-curso';
    if (!lanes[courseId]) {
      lanes[courseId] = {
        days: mode === 'weekly' ? decodeLaneDays(r.day_id) : undefined,
        sessionHours: r.daily_hours ? Number(r.daily_hours) : null,
        timeSlot: (r.time_slot as TimeSlotId | null) || null,
      };
    }
    return {
      id: r.module_id || r.id,
      name: r.module_name || 'Módulo',
      courseId,
      courseName: r.course_name || 'Curso',
      hours: Number(r.module_hours ?? r.allocated_hours ?? 0) || 0,
      order: i + 1,
      done: Boolean(r.is_completed),
    };
  });

  const planStart = parseISO(plan.start_date);
  let startDate = isValid(planStart) ? startOfDay(planStart) : startOfDay(new Date());
  if (from && startOfDay(from) > startDate) startDate = startOfDay(from);

  return {
    modules,
    mode,
    options: {
      startDate,
      studyDays: plan.study_days ?? [],
      dailyHours: Number(plan.daily_hours) || 1.5,
      mode,
      lanes,
    },
  };
}
