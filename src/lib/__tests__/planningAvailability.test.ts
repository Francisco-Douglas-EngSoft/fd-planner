import { describe, expect, it } from 'vitest';
import { getPlanningReservations, isModuleAvailable } from '../planningAvailability';

describe('planning availability', () => {
  it('reserves a course already selected in a course plan, including its modules', () => {
    const result = getPlanningReservations([{ study_plan_id: 'plan-1', course_id: 'course-1' }], []);
    expect(result.courses.has('course-1')).toBe(true);
    expect(isModuleAvailable({ id: 'module-1', course_id: 'course-1' }, result)).toBe(false);
    expect(isModuleAvailable({ id: 'module-2', course_id: 'course-2' }, result)).toBe(true);
  });
  it('reserves the parent course and other modules when a module is planned', () => {
    const result = getPlanningReservations([], [{ study_plan_id: 'plan-1', course_id: 'course-1', module_id: 'module-1' }]);
    expect(result.courses.has('course-1')).toBe(true);
    expect(result.modules.has('module-1')).toBe(true);
    expect(isModuleAvailable({ id: 'module-2', course_id: 'course-1' }, result)).toBe(false);
  });
  it('keeps the current plan content available while editing but blocks other plans', () => {
    const result = getPlanningReservations([
      { study_plan_id: 'current', course_id: 'own-course' },
      { study_plan_id: 'other', course_id: 'other-course' },
    ], [{ study_plan_id: 'current', course_id: 'own-course', module_id: 'own-module' }], 'current');
    expect(result.courses.has('own-course')).toBe(false);
    expect(isModuleAvailable({ id: 'own-module', course_id: 'own-course' }, result)).toBe(true);
    expect(result.courses.has('other-course')).toBe(true);
  });
  it('releases content when its association is removed', () => {
    const result = getPlanningReservations([], []);
    expect(result.courses.has('course-1')).toBe(false);
    expect(isModuleAvailable({ id: 'module-1', course_id: 'course-1' }, result)).toBe(true);
  });
});