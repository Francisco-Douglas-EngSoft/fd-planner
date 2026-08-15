import { describe, it, expect } from 'vitest';
import {
  computePlanningTotals,
  resolveDailyGoal,
  computeGoalProgress,
  isPlanActiveOn,
  type PlanLike,
} from '../planningTotals';

const course = (id: string, total: number, completed = 0) => ({
  course_id: id,
  courses: { id, total_hours: total, completed_hours: completed },
});

describe('computePlanningTotals', () => {
  it('soma as horas dos cursos vinculados', () => {
    const plans: PlanLike[] = [
      { id: 'p1', study_plan_courses: [course('c1', 40, 10), course('c2', 60, 20)] },
    ];
    const r = computePlanningTotals(plans);
    expect(r.totalHours).toBe(100);
    expect(r.completedHours).toBe(30);
    expect(r.progress).toBe(30);
  });

  it('não duplica cursos presentes em mais de um planejamento', () => {
    const plans: PlanLike[] = [
      { id: 'p1', study_plan_courses: [course('c1', 40, 10)] },
      { id: 'p2', study_plan_courses: [course('c1', 40, 10), course('c2', 60, 0)] },
    ];
    const r = computePlanningTotals(plans);
    expect(r.totalHours).toBe(100);
    expect(r.completedHours).toBe(10);
    expect(r.courseIds).toEqual(['c1', 'c2']);
  });

  it('prefere as horas reais calculadas por módulos', () => {
    const plans: PlanLike[] = [{ id: 'p1', study_plan_courses: [course('c1', 40, 10)] }];
    const r = computePlanningTotals(plans, { c1: 25 });
    expect(r.completedHours).toBe(25);
    expect(r.remainingHours).toBe(15);
  });

  it('usa a carga do planejamento quando não há cursos vinculados', () => {
    const r = computePlanningTotals([{ id: 'p1', total_hours: 80, study_plan_courses: [] }]);
    expect(r.totalHours).toBe(80);
    expect(r.completedHours).toBe(0);
    expect(r.progress).toBe(0);
  });

  it('nunca ultrapassa 100% de progresso', () => {
    const plans: PlanLike[] = [{ id: 'p1', study_plan_courses: [course('c1', 10, 999)] }];
    const r = computePlanningTotals(plans);
    expect(r.completedHours).toBe(10);
    expect(r.progress).toBe(100);
  });

  it('lida com listas vazias e valores nulos', () => {
    const r = computePlanningTotals([
      { id: 'p1', total_hours: null, study_plan_courses: null },
    ]);
    expect(r.totalHours).toBe(0);
    expect(r.progress).toBe(0);
  });
});

describe('isPlanActiveOn', () => {
  const monday = new Date(2026, 7, 17); // segunda-feira

  it('considera intervalo de datas e dias de estudo', () => {
    expect(
      isPlanActiveOn(
        { start_date: '2026-08-01', end_date: '2026-08-31', study_days: ['monday'] },
        monday,
      ),
    ).toBe(true);
    expect(
      isPlanActiveOn(
        { start_date: '2026-08-01', end_date: '2026-08-31', study_days: ['sunday'] },
        monday,
      ),
    ).toBe(false);
    expect(
      isPlanActiveOn({ start_date: '2026-09-01', end_date: '2026-09-30' }, monday),
    ).toBe(false);
  });

  it('planos sem prazo continuam ativos após a data final', () => {
    expect(
      isPlanActiveOn({ start_date: '2026-01-01', end_date: '2026-02-01', no_deadline: true }, monday),
    ).toBe(true);
  });
});

describe('resolveDailyGoal', () => {
  const monday = new Date(2026, 7, 17);
  const globalGoal = { hoursPerDay: 4, days: [1, 2, 3, 4, 5] };

  it('usa o planejamento ativo do dia', () => {
    const goal = resolveDailyGoal(
      [
        {
          id: 'p1',
          name: 'ENEM',
          daily_hours: 3,
          min_daily_hours: 1,
          max_daily_hours: 6,
          start_date: '2026-08-01',
          end_date: '2026-12-01',
          study_days: ['monday'],
        },
      ],
      monday,
      globalGoal,
    );
    expect(goal).toMatchObject({ hours: 3, source: 'plan', planName: 'ENEM', minHours: 1, maxHours: 6 });
  });

  it('cai para a meta global quando nenhum plano está ativo hoje', () => {
    const goal = resolveDailyGoal(
      [{ id: 'p1', daily_hours: 3, start_date: '2026-08-01', end_date: '2026-08-10' }],
      monday,
      globalGoal,
    );
    expect(goal).toMatchObject({ hours: 4, source: 'global' });
  });

  it('retorna nulo quando hoje não é dia de estudo da meta global', () => {
    const sunday = new Date(2026, 7, 16);
    expect(resolveDailyGoal([], sunday, globalGoal)).toBeNull();
  });
});

describe('computeGoalProgress', () => {
  it('calcula o percentual da meta diária', () => {
    expect(computeGoalProgress(90, 3)).toBe(50);
    expect(computeGoalProgress(0, 3)).toBe(0);
    expect(computeGoalProgress(600, 3)).toBe(100);
    expect(computeGoalProgress(60, 0)).toBe(0);
  });
});
