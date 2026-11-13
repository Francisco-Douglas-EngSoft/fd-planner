export interface CourseHoursInput {
  category: string | null;
  total_hours: number | null;
  completed_hours: number | null;
}

export interface CategoryHours {
  category: string;
  courses: number;
  totalHours: number;
  completedHours: number;
  remainingHours: number;
  /** Share (0-100) of the overall total hours that belongs to this category. */
  share: number;
  /** Completion (0-100) of this category. */
  progress: number;
}

export interface CategoryHoursSummary {
  categories: CategoryHours[];
  overall: Omit<CategoryHours, 'category' | 'share'>;
}

export const UNCATEGORIZED = 'Sem Categoria';

const safe = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

/** Sums course hours per category plus the overall total of every course. */
export function summarizeCategoryHours(courses: CourseHoursInput[]): CategoryHoursSummary {
  const map = new Map<string, { courses: number; totalHours: number; completedHours: number }>();
  let total = 0;
  let completed = 0;

  for (const c of courses) {
    const key = c.category?.trim() || UNCATEGORIZED;
    const t = safe(c.total_hours);
    const d = Math.min(safe(c.completed_hours), t || safe(c.completed_hours));
    const entry = map.get(key) ?? { courses: 0, totalHours: 0, completedHours: 0 };
    entry.courses += 1;
    entry.totalHours += t;
    entry.completedHours += d;
    map.set(key, entry);
    total += t;
    completed += d;
  }

  const categories = [...map.entries()]
    .map(([category, e]) => ({
      category,
      ...e,
      remainingHours: Math.max(0, e.totalHours - e.completedHours),
      share: total > 0 ? (e.totalHours / total) * 100 : 0,
      progress: e.totalHours > 0 ? (e.completedHours / e.totalHours) * 100 : 0,
    }))
    .sort((a, b) => b.totalHours - a.totalHours || a.category.localeCompare(b.category));

  return {
    categories,
    overall: {
      courses: courses.length,
      totalHours: total,
      completedHours: completed,
      remainingHours: Math.max(0, total - completed),
      progress: total > 0 ? (completed / total) * 100 : 0,
    },
  };
}
