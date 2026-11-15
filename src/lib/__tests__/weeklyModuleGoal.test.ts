import { describe, it, expect } from 'vitest';
import {
  countModulesCompletedInWeek,
  resolveWeeklyModuleTarget,
  weeklyModuleProgress,
  DEFAULT_WEEKLY_MODULE_GOAL,
} from '../weeklyModuleGoal';

// Quarta, 18/11/2026 — semana de segunda 16/11 a domingo 22/11
const now = new Date(2026, 10, 18, 12);
const iso = (d: number, h = 10) => new Date(2026, 10, d, h).toISOString();

describe('weekly module goal', () => {
  it('counts only modules completed from Monday to Sunday of the current week', () => {
    const n = countModulesCompletedInWeek(
      [
        { is_completed: true, completed_at: iso(16, 0) }, // segunda 00h
        { is_completed: true, completed_at: iso(22, 23) }, // domingo 23h
        { is_completed: true, completed_at: iso(15, 23) }, // domingo anterior
        { is_completed: true, completed_at: iso(23, 1) }, // próxima segunda
        { is_completed: false, completed_at: iso(17) }, // reaberto
      ],
      now,
    );
    expect(n).toBe(2);
  });

  it('inherits the last goal set in an earlier week', () => {
    expect(
      resolveWeeklyModuleTarget(
        [
          { week_start: '2026-11-02', target_value: 4 },
          { week_start: '2026-11-09', target_value: 6 },
          { week_start: '2026-11-23', target_value: 9 }, // futura, ignorada
        ],
        now,
      ),
    ).toBe(6);
  });

  it('uses the default goal when none was ever set', () => {
    expect(resolveWeeklyModuleTarget([], now)).toBe(DEFAULT_WEEKLY_MODULE_GOAL);
  });

  it('reports progress, remaining and caps percent at 100', () => {
    expect(weeklyModuleProgress(2, 5)).toMatchObject({ percent: 40, remaining: 3, reached: false });
    expect(weeklyModuleProgress(7, 5)).toMatchObject({ percent: 100, remaining: 0, reached: true });
  });
});
