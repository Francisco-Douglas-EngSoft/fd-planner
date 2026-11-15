import { describe, it, expect } from 'vitest';
import { buildStudyRhythm } from '../studyRhythm';

// Domingo, 15/11/2026 às 15h (horário local)
const now = new Date(2026, 10, 15, 15, 0, 0);
const at = (d: number, h = 10) => new Date(2026, 10, d, h, 0, 0).toISOString();

describe('buildStudyRhythm', () => {
  it('sums focus minutes per day as hours, including empty days', () => {
    const r = buildStudyRhythm({
      sessions: [
        { duration_minutes: 30, completed_at: at(15), session_type: 'work' },
        { duration_minutes: 60, completed_at: at(15, 14), session_type: 'work' },
        { duration_minutes: 45, completed_at: at(13), session_type: 'work' },
      ],
      modules: [],
      granularity: 'day',
      periods: 7,
      now,
    });
    expect(r).toHaveLength(7);
    expect(r[6]).toMatchObject({ key: '2026-11-15', focusHours: 1.5, isCurrent: true });
    expect(r[4]).toMatchObject({ key: '2026-11-13', focusHours: 0.75 });
    expect(r[5].focusHours).toBe(0);
  });

  it('ignores break sessions', () => {
    const r = buildStudyRhythm({
      sessions: [
        { duration_minutes: 25, completed_at: at(15), session_type: 'work' },
        { duration_minutes: 5, completed_at: at(15), session_type: 'break' },
      ],
      modules: [],
      granularity: 'day',
      periods: 1,
      now,
    });
    expect(r[0].focusHours).toBeCloseTo(25 / 60, 2);
  });

  it('groups weeks starting on Monday and adds completed module hours', () => {
    const r = buildStudyRhythm({
      sessions: [
        { duration_minutes: 120, completed_at: at(9), session_type: 'work' }, // segunda 09/11
        { duration_minutes: 60, completed_at: at(15), session_type: 'work' }, // domingo 15/11, mesma semana
        { duration_minutes: 90, completed_at: at(8), session_type: 'work' }, // domingo 08/11, semana anterior
      ],
      modules: [
        { hours: 4, completed_at: at(10) },
        { hours: 2, completed_at: null },
      ],
      granularity: 'week',
      periods: 2,
      now,
    });
    expect(r.map((b) => b.key)).toEqual(['2026-11-02', '2026-11-09']);
    expect(r[1]).toMatchObject({ focusHours: 3, moduleHours: 4, isCurrent: true });
    expect(r[0]).toMatchObject({ focusHours: 1.5, moduleHours: 0 });
  });
});

import { buildCourseComparison, filterByCourse } from '../studyRhythm';

describe('course filter and comparison', () => {
  const sessions = [
    { duration_minutes: 60, completed_at: at(15), session_type: 'work', course_id: 'a' },
    { duration_minutes: 30, completed_at: at(14), session_type: 'work', course_id: 'b' },
    { duration_minutes: 90, completed_at: at(14), session_type: 'work', course_id: 'a' },
  ];

  it('filters the chart to a single course', () => {
    const r = buildStudyRhythm({ sessions: filterByCourse(sessions, 'b'), modules: [], granularity: 'day', periods: 2, now });
    expect(r.map((b) => b.focusHours)).toEqual([0.5, 0]);
  });

  it('builds one series per course, ordered by most hours', () => {
    const { rows, series } = buildCourseComparison({ sessions, modules: [], metric: 'focus', granularity: 'day', periods: 2, now });
    expect(series.map((s) => [s.courseId, s.totalHours])).toEqual([['a', 2.5], ['b', 0.5]]);
    expect(rows[0]).toMatchObject({ c_a: 1.5, c_b: 0.5 });
    expect(rows[1]).toMatchObject({ c_a: 1, c_b: 0 });
  });
});
