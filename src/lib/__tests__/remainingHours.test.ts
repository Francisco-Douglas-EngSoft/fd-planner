import { describe, it, expect } from 'vitest';
import { computeRemainingHours } from '../studyHours';

describe('computeRemainingHours', () => {
  it('subtracts completed hours from each course workload', () => {
    expect(
      computeRemainingHours([
        { status: 'in_progress', total_hours: 40, completed_hours: 10 },
        { status: 'not_started', total_hours: 20, completed_hours: 0 },
      ]),
    ).toBe(50);
  });

  it('drops a course from the remaining total once it is completed', () => {
    expect(
      computeRemainingHours([
        { status: 'completed', total_hours: 40, completed_hours: 30 },
        { status: 'in_progress', total_hours: 20, completed_hours: 5 },
      ]),
    ).toBe(15);
  });

  it('never counts negative hours when studied more than the workload', () => {
    expect(
      computeRemainingHours([
        { status: 'in_progress', total_hours: 10, completed_hours: 12 },
        { status: 'in_progress', total_hours: 8, completed_hours: 2 },
      ]),
    ).toBe(6);
  });
});
