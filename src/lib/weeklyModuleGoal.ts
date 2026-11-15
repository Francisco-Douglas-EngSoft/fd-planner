/**
 * Meta semanal de módulos concluídos.
 * - A semana começa na segunda-feira 00:00 (horário local).
 * - Conta cada módulo com `is_completed` e `completed_at` dentro da semana.
 * - A meta vale até o usuário trocar: semanas sem meta própria herdam a última definida.
 */
import { addDays, format, startOfWeek } from 'date-fns';

export const DEFAULT_WEEKLY_MODULE_GOAL = 3;

export function weekBounds(now = new Date()) {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = addDays(start, 7); // exclusivo
  return {
    start,
    end,
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(addDays(start, 6), 'yyyy-MM-dd'),
  };
}

export function countModulesCompletedInWeek(
  modules: { is_completed: boolean | null; completed_at: string | null }[],
  now = new Date(),
): number {
  const { start, end } = weekBounds(now);
  return modules.filter((m) => {
    if (!m.is_completed || !m.completed_at) return false;
    const d = new Date(m.completed_at);
    return d >= start && d < end;
  }).length;
}

/** Meta da semana atual: a própria ou a última definida (herdada). */
export function resolveWeeklyModuleTarget(
  goals: { week_start: string; target_value: number }[],
  now = new Date(),
): number {
  const { startDate } = weekBounds(now);
  const valid = goals
    .filter((g) => g.week_start <= startDate && g.target_value > 0)
    .sort((a, b) => b.week_start.localeCompare(a.week_start));
  return valid[0]?.target_value ?? DEFAULT_WEEKLY_MODULE_GOAL;
}

export function weeklyModuleProgress(completed: number, target: number) {
  const safeTarget = Math.max(1, Math.round(target));
  return {
    completed,
    target: safeTarget,
    remaining: Math.max(0, safeTarget - completed),
    percent: Math.min(100, Math.round((completed / safeTarget) * 100)),
    reached: completed >= safeTarget,
  };
}
