import { render, screen } from '@testing-library/react';
import { computeCompletedHours, ModuleLike, SubmoduleLike } from './studyHours';
import { describe, it, expect } from 'vitest';

describe('studyHours logic', () => {
  it('calculates hours correctly for modules without submodules', () => {
    const modules: ModuleLike[] = [
      { id: 'm1', course_id: 'c1', hours: 10, is_completed: true },
      { id: 'm2', course_id: 'c1', hours: 5, is_completed: false },
    ];
    const submodules: SubmoduleLike[] = [];
    
    const result = computeCompletedHours(modules, submodules);
    expect(result.totalCompletedHours).toBe(10);
    expect(result.byCourse['c1']).toBe(10);
  });

  it('calculates hours correctly for modules with submodules', () => {
    const modules: ModuleLike[] = [
      { id: 'm1', course_id: 'c1', hours: 10, is_completed: false },
    ];
    const submodules: SubmoduleLike[] = [
      { module_id: 'm1', hours: 2, is_completed: true },
      { module_id: 'm1', hours: 3, is_completed: true },
      { module_id: 'm1', hours: 5, is_completed: false },
    ];
    
    const result = computeCompletedHours(modules, submodules);
    // Submodules sum (2+3) = 5. Even if module is_completed is false, submodules count.
    expect(result.totalCompletedHours).toBe(5);
    expect(result.byCourse['c1']).toBe(5);
  });

  it('handles incomplete data (null hours)', () => {
    const modules: ModuleLike[] = [
      { id: 'm1', course_id: 'c1', hours: null, is_completed: true },
    ];
    const result = computeCompletedHours(modules, []);
    expect(result.totalCompletedHours).toBe(0);
  });
});
