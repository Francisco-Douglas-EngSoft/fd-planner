import { describe, it, expect } from 'vitest';
import { summarizeCategoryHours } from '../categoryHours';

const courses = [
  { category: 'React', total_hours: 10, completed_hours: 4 },
  { category: 'React', total_hours: 5.5, completed_hours: 5.5 },
  { category: 'Python', total_hours: 20, completed_hours: 0 },
  { category: null, total_hours: 2, completed_hours: 1 },
];

describe('summarizeCategoryHours', () => {
  it('sums total hours of every course in a category', () => {
    const react = summarizeCategoryHours(courses).categories.find((c) => c.category === 'React')!;
    expect(react.totalHours).toBe(15.5);
    expect(react.completedHours).toBe(9.5);
    expect(react.remainingHours).toBe(6);
    expect(react.courses).toBe(2);
  });

  it('sums the hours of all courses across categories', () => {
    const { overall } = summarizeCategoryHours(courses);
    expect(overall.totalHours).toBe(37.5);
    expect(overall.completedHours).toBe(10.5);
    expect(overall.courses).toBe(4);
  });

  it('groups courses without category under "Sem Categoria"', () => {
    const none = summarizeCategoryHours(courses).categories.find((c) => c.category === 'Sem Categoria')!;
    expect(none.totalHours).toBe(2);
  });

  it('ignores invalid or negative hours', () => {
    const { overall } = summarizeCategoryHours([{ category: 'X', total_hours: null, completed_hours: -3 }]);
    expect(overall.totalHours).toBe(0);
    expect(overall.completedHours).toBe(0);
  });
});
