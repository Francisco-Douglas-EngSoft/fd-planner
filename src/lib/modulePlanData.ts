/**
 * Leitura/escrita dos módulos de planos "Por Módulo" compartilhada entre
 * Planejamentos e Foco (a parte pura fica em `modulePlanAdapter.ts`).
 */
import { supabase } from '@/integrations/supabase/client';
import type { PlanModuleRow } from './modulePlanAdapter';

type WithModules = { study_plan_modules?: PlanModuleRow[] | null };

/**
 * Completa cada linha de study_plan_modules com o nome do curso e o nome,
 * horas e conclusão atuais do módulo do curso. Não há FK entre as tabelas,
 * por isso são buscas separadas.
 */
export async function enrichPlanModules<T extends WithModules>(plans: T[]): Promise<T[]> {
  const rows = plans.flatMap((p) => p.study_plan_modules || []);
  const moduleIds = Array.from(new Set(rows.map((r) => r.module_id).filter(Boolean))) as string[];
  const courseIds = Array.from(new Set(rows.map((r) => r.course_id).filter(Boolean))) as string[];
  if (!moduleIds.length && !courseIds.length) return plans;

  const [modRes, courseRes] = await Promise.all([
    moduleIds.length
      ? supabase.from('course_modules').select('id, name, hours, is_completed').in('id', moduleIds)
      : Promise.resolve({ data: [] as { id: string; name: string; hours: number | null; is_completed: boolean | null }[] }),
    courseIds.length
      ? supabase.from('courses').select('id, name').in('id', courseIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const modMap = new Map((modRes.data || []).map((m) => [m.id, m]));
  const courseMap = new Map((courseRes.data || []).map((c) => [c.id, c.name]));

  return plans.map((p) => ({
    ...p,
    study_plan_modules: (p.study_plan_modules || []).map((r) => {
      const m = r.module_id ? modMap.get(r.module_id) : undefined;
      return {
        ...r,
        module_name: m?.name || r.module_name,
        module_hours: m?.hours != null ? Number(m.hours) : r.module_hours,
        is_completed: Boolean(r.is_completed || m?.is_completed),
        course_name: (r.course_id && courseMap.get(r.course_id)) || null,
      };
    }),
  }));
}

/**
 * Marca um módulo do curso como concluído (com seus submódulos), reflete nos
 * planos que o usam e recalcula as horas concluídas do curso — mesma regra da
 * tela de Cursos (módulo com submódulos conta as horas dos submódulos).
 */
export async function completeCourseModule(moduleId: string): Promise<{ courseId: string | null }> {
  const now = new Date().toISOString();
  const { data: mod, error: modErr } = await supabase
    .from('course_modules')
    .select('id, course_id')
    .eq('id', moduleId)
    .maybeSingle();
  if (modErr) throw modErr;

  const { error: upErr } = await supabase
    .from('course_modules')
    .update({ is_completed: true, completed_at: now })
    .eq('id', moduleId);
  if (upErr) throw upErr;

  await Promise.all([
    supabase.from('course_submodules').update({ is_completed: true, completed_at: now }).eq('module_id', moduleId),
    supabase.from('study_plan_modules').update({ is_completed: true }).eq('module_id', moduleId),
  ]);

  const courseId = mod?.course_id ?? null;
  if (courseId) {
    const { data: mods } = await supabase
      .from('course_modules')
      .select('id, hours, is_completed')
      .eq('course_id', courseId);
    const ids = (mods || []).map((m) => m.id);
    const { data: subs } = ids.length
      ? await supabase.from('course_submodules').select('module_id, hours, is_completed').in('module_id', ids)
      : { data: [] as { module_id: string; hours: number | null; is_completed: boolean }[] };
    let total = 0;
    let done = 0;
    for (const m of mods || []) {
      const s = (subs || []).filter((x) => x.module_id === m.id);
      if (s.length) {
        total += s.reduce((a, x) => a + Number(x.hours || 0), 0);
        done += s.filter((x) => x.is_completed).reduce((a, x) => a + Number(x.hours || 0), 0);
      } else {
        total += Number(m.hours || 0);
        if (m.is_completed) done += Number(m.hours || 0);
      }
    }
    await supabase.from('courses').update({ completed_hours: done, total_hours: total }).eq('id', courseId);
  }
  return { courseId };
}
