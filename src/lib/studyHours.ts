/**
 * Fonte única de verdade para o cálculo de horas de estudo.
 *
 * Regras (usadas por Dashboard, Relatórios e Planejamento):
 * - "Horas Estudadas" = soma real das horas concluídas em módulos/submódulos.
 *   Se o módulo possui submódulos, contam apenas os submódulos concluídos;
 *   caso contrário, conta o módulo inteiro quando concluído.
 * - "Tempo de Foco" = soma de `duration_minutes` das sessões do tipo `work`.
 *
 * Nunca use `courses.completed_hours` diretamente: essa coluna pode estar
 * defasada. Prefira `getCourseCompletedHours()` / `applyCompletedHours()`.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ModuleLike {
  id: string;
  course_id: string;
  hours: number | null;
  is_completed: boolean | null;
}

export interface SubmoduleLike {
  module_id: string;
  hours: number | null;
  is_completed: boolean | null;
}

export interface StudyHours {
  /** Horas concluídas por curso (id do curso -> horas). */
  byCourse: Record<string, number>;
  /** Soma total das horas concluídas em todos os cursos. */
  totalCompletedHours: number;
}

/** Calcula as horas concluídas a partir de módulos e submódulos já carregados. */
export function computeCompletedHours(
  modules: ModuleLike[],
  submodules: SubmoduleLike[],
): StudyHours {
  const subsByModule = new Map<string, SubmoduleLike[]>();
  for (const s of submodules) {
    const list = subsByModule.get(s.module_id) ?? [];
    list.push(s);
    subsByModule.set(s.module_id, list);
  }

  const byCourse: Record<string, number> = {};
  let totalCompletedHours = 0;

  for (const m of modules) {
    const subs = subsByModule.get(m.id) ?? [];
    const hours =
      subs.length > 0
        ? subs.filter((s) => s.is_completed).reduce((acc, s) => acc + (s.hours || 0), 0)
        : m.is_completed
          ? m.hours || 0
          : 0;

    if (hours === 0) continue;
    byCourse[m.course_id] = (byCourse[m.course_id] || 0) + hours;
    totalCompletedHours += hours;
  }

  return { byCourse, totalCompletedHours };
}

/** Busca no banco e retorna as horas concluídas do usuário (por curso e total). */
export async function fetchCompletedHours(userId: string): Promise<StudyHours> {
  const [modulesResult, subModulesResult] = await Promise.all([
    supabase
      .from('course_modules')
      .select('id, course_id, hours, is_completed, courses!inner(user_id)')
      .eq('courses.user_id', userId),
    supabase
      .from('course_submodules')
      .select('module_id, hours, is_completed, course_modules!inner(courses!inner(user_id))')
      .eq('course_modules.courses.user_id', userId),
  ]);

  if (modulesResult.error) throw new Error(modulesResult.error.message);
  if (subModulesResult.error) throw new Error(subModulesResult.error.message);

  return computeCompletedHours(
    (modulesResult.data || []) as unknown as ModuleLike[],
    (subModulesResult.data || []) as unknown as SubmoduleLike[],
  );
}

/** Horas concluídas de um curso específico (0 quando não há módulos concluídos). */
export function getCourseCompletedHours(hours: StudyHours, courseId: string): number {
  return hours.byCourse[courseId] ?? 0;
}

/**
 * Substitui `completed_hours` de uma lista de cursos pelo valor real calculado,
 * mantendo compatibilidade com telas que já leem esse campo.
 */
export function applyCompletedHours<T extends { id: string; completed_hours?: number | null }>(
  courses: T[],
  hours: StudyHours,
): T[] {
  return courses.map((c) => ({ ...c, completed_hours: getCourseCompletedHours(hours, c.id) }));
}

/** Soma dos minutos de foco (apenas sessões de trabalho). */
export function sumFocusMinutes(
  sessions: { duration_minutes: number | null; session_type?: string | null }[],
  onlyWork = true,
): number {
  return sessions
    .filter((s) => (onlyWork ? s.session_type == null || s.session_type === 'work' : true))
    .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
}
