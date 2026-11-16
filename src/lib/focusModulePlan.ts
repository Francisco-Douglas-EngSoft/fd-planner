/**
 * Regras puras para mostrar planejamentos "Por Módulo" na página Foco
 * (curso atual, progresso, ritmo e se o plano conta como ativo hoje).
 * Os planos por curso continuam usando study_plan_courses.
 */
import { decodeLaneDays } from './moduleSchedule';
import type { PlanModuleRow } from './modulePlanAdapter';

export interface FocusModulePlan {
  start_date: string;
  end_date: string;
  daily_hours: number | null;
  study_days: string[] | null;
  total_hours?: number | null;
  study_plan_modules?: PlanModuleRow[] | null;
}

const sortRows = (rows: PlanModuleRow[]) =>
  [...rows].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));

export const planModuleRows = (plan: Pick<FocusModulePlan, 'study_plan_modules'>) =>
  sortRows(plan.study_plan_modules ?? []);

/** Primeiro módulo não concluído (na ordem do plano); se todos acabaram, o primeiro. */
export function currentModuleRow(plan: Pick<FocusModulePlan, 'study_plan_modules'>): PlanModuleRow | null {
  const rows = planModuleRows(plan);
  return rows.find((r) => !r.is_completed) ?? rows[0] ?? null;
}

const rowHours = (r: PlanModuleRow) => Number(r.module_hours ?? r.allocated_hours ?? 0) || 0;

/** Horas concluídas = soma das horas dos módulos marcados como concluídos. */
export function modulePlanProgress(plan: FocusModulePlan) {
  const rows = planModuleRows(plan);
  const sum = rows.reduce((s, r) => s + rowHours(r), 0);
  const completedHours = rows.filter((r) => r.is_completed).reduce((s, r) => s + rowHours(r), 0);
  const totalHours = Number(plan.total_hours) > 0 ? Number(plan.total_hours) : sum;
  const completedCount = rows.filter((r) => r.is_completed).length;
  return {
    completedHours,
    totalHours,
    percent: totalHours > 0 ? Math.min(100, (completedHours / totalHours) * 100) : 0,
    completedCount,
    pendingCount: rows.length - completedCount,
  };
}

/** Dias de estudo e horas por dia do curso dentro do plano (trilha semanal ou plano inteiro). */
export function moduleCourseSchedule(plan: FocusModulePlan, courseId: string) {
  const rows = planModuleRows(plan).filter((r) => r.course_id === courseId);
  if (rows.length === 0) return null;
  const laneDays = decodeLaneDays(rows.find((r) => r.day_id)?.day_id);
  const laneHours = Number(rows.find((r) => Number(r.daily_hours) > 0)?.daily_hours);
  const planHours = Number(plan.daily_hours);
  const dailyHours = Number.isFinite(laneHours) && laneHours > 0 ? laneHours : planHours;
  if (!Number.isFinite(dailyHours) || dailyHours <= 0) return null;
  return {
    dailyHours,
    studyDays: laneDays.length > 0 ? laneDays : plan.study_days ?? [],
    planStartDate: plan.start_date,
    planEndDate: plan.end_date,
  };
}

/** Plano por módulo é "de hoje" quando está no período, hoje é dia de estudo e sobra módulo. */
export function isModulePlanActiveToday(plan: FocusModulePlan, todayStr: string, todayDayId: string) {
  const rows = planModuleRows(plan);
  if (rows.length === 0 || !rows.some((r) => !r.is_completed)) return false;
  if (plan.start_date > todayStr || (plan.end_date && plan.end_date < todayStr)) return false;
  const lanes = rows.map((r) => decodeLaneDays(r.day_id)).filter((d) => d.length > 0);
  if (lanes.length > 0) return lanes.some((d) => d.includes(todayDayId));
  return (plan.study_days ?? []).includes(todayDayId);
}
