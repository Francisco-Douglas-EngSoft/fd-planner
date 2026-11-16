import { describe, it, expect } from 'vitest';
import {
  currentModuleRow,
  modulePlanProgress,
  moduleCourseSchedule,
  isModulePlanActiveToday,
} from '../focusModulePlan';
import type { PlanModuleRow } from '../modulePlanAdapter';

const row = (p: Partial<PlanModuleRow>): PlanModuleRow => ({
  id: p.id ?? Math.random().toString(),
  module_id: p.module_id ?? null,
  course_id: p.course_id ?? 'c1',
  module_name: p.module_name ?? 'M',
  module_hours: p.module_hours ?? 10,
  allocated_hours: null,
  sequence_order: p.sequence_order ?? 0,
  is_completed: p.is_completed ?? false,
  day_id: p.day_id ?? null,
  daily_hours: p.daily_hours ?? null,
  time_slot: null,
});

const plan = (rows: PlanModuleRow[], extra = {}) => ({
  start_date: '2026-11-01',
  end_date: '2026-12-31',
  daily_hours: 2,
  study_days: ['monday', 'wednesday'],
  total_hours: 0,
  study_plan_modules: rows,
  ...extra,
});

describe('focusModulePlan', () => {
  it('current module is the first unfinished one in plan order', () => {
    const p = plan([
      row({ id: 'b', sequence_order: 2, course_id: 'c2' }),
      row({ id: 'a', sequence_order: 1, is_completed: true }),
    ]);
    expect(currentModuleRow(p)?.id).toBe('b');
  });

  it('progress counts hours of completed modules', () => {
    const p = plan([row({ module_hours: 30, is_completed: true }), row({ module_hours: 70 })]);
    const r = modulePlanProgress(p);
    expect(r.completedHours).toBe(30);
    expect(r.totalHours).toBe(100);
    expect(r.percent).toBe(30);
    expect(r.pendingCount).toBe(1);
  });

  it('course pace uses the weekly lane days and hours when set', () => {
    const p = plan([row({ course_id: 'c1', day_id: 'tuesday,friday', daily_hours: 1.5 })]);
    expect(moduleCourseSchedule(p, 'c1')).toMatchObject({ dailyHours: 1.5, studyDays: ['tuesday', 'friday'] });
  });

  it('course pace falls back to the plan days and hours in sequence mode', () => {
    const p = plan([row({ course_id: 'c1' })]);
    expect(moduleCourseSchedule(p, 'c1')).toMatchObject({ dailyHours: 2, studyDays: ['monday', 'wednesday'] });
    expect(moduleCourseSchedule(p, 'other')).toBeNull();
  });

  it('plan is active today only in period, on a study day, with modules left', () => {
    const p = plan([row({})]);
    expect(isModulePlanActiveToday(p, '2026-11-16', 'monday')).toBe(true);
    expect(isModulePlanActiveToday(p, '2026-11-17', 'tuesday')).toBe(false);
    expect(isModulePlanActiveToday(p, '2027-01-04', 'monday')).toBe(false);
    expect(isModulePlanActiveToday(plan([row({ is_completed: true })]), '2026-11-16', 'monday')).toBe(false);
  });
});
