/**
 * Cálculos compartilhados de horas de planejamento e meta diária.
 *
 * Fonte única de verdade para:
 * - Horas totais (sem duplicar cursos que aparecem em vários planejamentos)
 * - Horas concluídas reais (preferindo o cálculo por módulos/submódulos)
 * - Meta diária do dia (planejamento ativo hoje > meta global)
 */

export const DAY_IDS: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export interface PlanCourseLike {
  course_id?: string | null;
  courses?: {
    id?: string;
    name?: string;
    total_hours?: number | null;
    completed_hours?: number | null;
  } | null;
}

export interface PlanLike {
  id?: string;
  name?: string;
  total_hours?: number | null;
  daily_hours?: number | null;
  min_daily_hours?: number | null;
  max_daily_hours?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  no_deadline?: boolean | null;
  study_days?: string[] | null;
  study_plan_courses?: PlanCourseLike[] | null;
}

export interface PlanningTotals {
  totalHours: number;
  completedHours: number;
  remainingHours: number;
  progress: number;
  /** Ids de cursos considerados (já sem duplicatas). */
  courseIds: string[];
}

/**
 * Soma as horas dos planejamentos contando cada curso apenas uma vez.
 * Planejamentos sem cursos vinculados usam a própria carga horária.
 */
export function computePlanningTotals(
  plans: PlanLike[],
  realCompletedHours: Record<string, number> = {},
): PlanningTotals {
  const seen = new Set<string>();
  let totalHours = 0;
  let completedHours = 0;

  for (const plan of plans ?? []) {
    const planCourses = plan.study_plan_courses ?? [];
    if (planCourses.length === 0) {
      totalHours += Number(plan.total_hours) || 0;
      continue;
    }

    for (const pc of planCourses) {
      const id = pc.course_id || pc.courses?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      totalHours += Number(pc.courses?.total_hours) || 0;
      const real = realCompletedHours[id];
      completedHours += Number(real ?? pc.courses?.completed_hours) || 0;
    }
  }

  completedHours = Math.max(0, Math.min(completedHours, totalHours || completedHours));
  const remainingHours = Math.max(0, totalHours - completedHours);
  const progress = totalHours > 0 ? Math.min(100, (completedHours / totalHours) * 100) : 0;

  return {
    totalHours,
    completedHours,
    remainingHours,
    progress,
    courseIds: Array.from(seen),
  };
}

export interface DailyGoal {
  /** Meta de horas para o dia. */
  hours: number;
  minHours: number | null;
  maxHours: number | null;
  source: 'plan' | 'global';
  planId?: string;
  planName?: string;
}

/** Verifica se um planejamento está ativo (e previsto) na data informada. */
export function isPlanActiveOn(plan: PlanLike, date: Date): boolean {
  const iso = toISODate(date);
  const startsOk = !plan.start_date || plan.start_date <= iso;
  const endsOk = plan.no_deadline || !plan.end_date || plan.end_date >= iso;
  if (!startsOk || !endsOk) return false;

  const days = plan.study_days ?? [];
  if (days.length === 0) return true;
  return days.includes(DAY_IDS[date.getDay()]);
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolve a meta diária do dia: usa o planejamento ativo de hoje quando existe,
 * caso contrário cai para a meta global do usuário.
 */
export function resolveDailyGoal(
  plans: PlanLike[],
  date: Date,
  globalGoal: { hoursPerDay: number; days: number[] },
): DailyGoal | null {
  const active = (plans ?? []).filter((p) => isPlanActiveOn(p, date));

  // Preferimos o planejamento ativo com a maior meta diária definida.
  const best = active
    .filter((p) => Number(p.daily_hours) > 0)
    .sort((a, b) => Number(b.daily_hours) - Number(a.daily_hours))[0];

  if (best) {
    return {
      hours: Number(best.daily_hours),
      minHours: Number(best.min_daily_hours) > 0 ? Number(best.min_daily_hours) : null,
      maxHours: Number(best.max_daily_hours) > 0 ? Number(best.max_daily_hours) : null,
      source: 'plan',
      planId: best.id,
      planName: best.name,
    };
  }

  const isGlobalDay = globalGoal.days.length === 0 || globalGoal.days.includes(date.getDay());
  if (!isGlobalDay || !(globalGoal.hoursPerDay > 0)) return null;

  return {
    hours: globalGoal.hoursPerDay,
    minHours: null,
    maxHours: null,
    source: 'global',
  };
}

/** Progresso (0-100) da meta diária a partir dos minutos estudados hoje. */
export function computeGoalProgress(studiedMinutes: number, goalHours: number): number {
  if (!(goalHours > 0)) return 0;
  return Math.max(0, Math.min(100, (studiedMinutes / (goalHours * 60)) * 100));
}
