import { supabase } from '@/integrations/supabase/client';

export interface PlanningLink {
  study_plan_id: string;
  course_id: string | null;
  module_id?: string | null;
}

export function getPlanningReservations(
  courseLinks: PlanningLink[],
  moduleLinks: PlanningLink[],
  currentPlanId?: string,
) {
  const courses = new Set<string>();
  const modules = new Set<string>();
  for (const link of [...courseLinks, ...moduleLinks]) {
    if (link.study_plan_id === currentPlanId) continue;
    if (link.course_id) courses.add(link.course_id);
    if (link.module_id) modules.add(link.module_id);
  }
  return { courses, modules };
}

export function isModuleAvailable(
  module: { id: string; course_id: string },
  reservations: ReturnType<typeof getPlanningReservations>,
) {
  return !reservations.courses.has(module.course_id) && !reservations.modules.has(module.id);
}

// RLS scopes both link tables to the signed-in user's plans; paginate all links.
export async function loadPlanningReservations(currentPlanId?: string) {
  const readLinks = async (table: 'study_plan_courses' | 'study_plan_modules') => {
    const rows: PlanningLink[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from(table)
        .select(table === 'study_plan_courses' ? 'study_plan_id, course_id' : 'study_plan_id, course_id, module_id')
        .order('id').range(offset, offset + 999);
      if (error) throw error;
      const page = (data || []) as unknown as PlanningLink[];
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return rows;
  };
  const [courses, modules] = await Promise.all([
    readLinks('study_plan_courses'), readLinks('study_plan_modules'),
  ]);
  return getPlanningReservations(courses, modules, currentPlanId);
}