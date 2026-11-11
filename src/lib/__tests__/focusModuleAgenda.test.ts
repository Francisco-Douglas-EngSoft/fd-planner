import { describe, it, expect } from 'vitest';
import {
  buildFocusModuleAgenda,
  splitStudiedMinutes,
  suggestedSessionMinutes,
  type FocusAgendaPlan,
} from '../focusModuleAgenda';
import type { PlanModuleRow } from '../modulePlanAdapter';

// 09/11/2026 é uma segunda-feira.
const MONDAY = new Date(2026, 10, 9, 10, 0);
const SATURDAY = new Date(2026, 10, 14, 10, 0);
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const row = (id: string, course: string, hours: number, order: number, extra: Partial<PlanModuleRow> = {}): PlanModuleRow => ({
  id: `row-${id}`,
  module_id: id,
  course_id: course,
  module_name: id.toUpperCase(),
  module_hours: hours,
  allocated_hours: null,
  sequence_order: order,
  is_completed: false,
  day_id: null,
  daily_hours: null,
  time_slot: null,
  course_name: `Curso ${course}`,
  ...extra,
});

const plan = (rows: PlanModuleRow[], over: Partial<FocusAgendaPlan> = {}): FocusAgendaPlan => ({
  id: 'p1',
  name: 'Plano',
  planning_type: 'module',
  start_date: '2026-11-01',
  end_date: '2026-12-31',
  daily_hours: 2,
  study_days: WEEKDAYS,
  study_plan_modules: rows,
  ...over,
});

const none = { beforeToday: {}, today: {} };

describe('buildFocusModuleAgenda', () => {
  it('em sequência, hoje mostra o módulo atual com a meta diária do plano', () => {
    const a = buildFocusModuleAgenda([plan([row('a', 'c1', 3, 1), row('b', 'c1', 2, 2)])], none, MONDAY);
    expect(a.items).toHaveLength(1);
    expect(a.items[0]).toMatchObject({ moduleId: 'a', plannedMinutes: 120, remainingTodayMinutes: 120, courseId: 'c1' });
    expect(a.plannedTodayMinutes).toBe(120);
  });

  it('o que foi estudado antes de hoje encurta o módulo e o próximo começa no mesmo dia', () => {
    // A tem 3h, 2h já feitas: hoje fica 1h de A + 1h de B.
    const a = buildFocusModuleAgenda(
      [plan([row('a', 'c1', 3, 1), row('b', 'c1', 2, 2)])],
      { beforeToday: { a: 120 }, today: {} },
      MONDAY,
    );
    expect(a.items.map((i) => [i.moduleId, i.plannedMinutes])).toEqual([['a', 60], ['b', 60]]);
    expect(a.items[0].moduleProgressPct).toBe(67);
  });

  it('estudar hoje preenche a meta do dia sem mudar o planejado', () => {
    const a = buildFocusModuleAgenda(
      [plan([row('a', 'c1', 3, 1)])],
      { beforeToday: {}, today: { a: 90 } },
      MONDAY,
    );
    expect(a.items[0]).toMatchObject({ plannedMinutes: 120, studiedTodayMinutes: 90, remainingTodayMinutes: 30, todayDone: false });
    expect(a.studiedTodayMinutes).toBe(90);
  });

  it('meta do dia batida marca o módulo como feito hoje', () => {
    const a = buildFocusModuleAgenda([plan([row('a', 'c1', 5, 1)])], { beforeToday: {}, today: { a: 120 } }, MONDAY);
    expect(a.items[0].todayDone).toBe(true);
    expect(a.items[0].readyToComplete).toBe(false);
  });

  it('módulo com as horas cumpridas aparece para concluir', () => {
    const a = buildFocusModuleAgenda(
      [plan([row('a', 'c1', 2, 1), row('b', 'c1', 4, 2)])],
      { beforeToday: { a: 120 }, today: {} },
      MONDAY,
    );
    expect(a.items.map((i) => i.moduleId)).toEqual(['b']);
    expect(a.awaitingCompletion.map((i) => i.moduleId)).toEqual(['a']);
    expect(a.awaitingCompletion[0].readyToComplete).toBe(true);
  });

  it('por dias da semana, só aparecem os cursos do dia de hoje', () => {
    const rows = [
      row('a', 'c1', 4, 1, { day_id: 'monday,wednesday' }),
      row('b', 'c2', 4, 2, { day_id: 'tuesday,thursday', daily_hours: 1 }),
    ];
    const a = buildFocusModuleAgenda([plan(rows)], none, MONDAY);
    expect(a.items.map((i) => i.moduleId)).toEqual(['a']);
    expect(a.items[0].plannedMinutes).toBe(120);
  });

  it('dia sem estudo mostra o próximo dia planejado', () => {
    const a = buildFocusModuleAgenda([plan([row('a', 'c1', 3, 1)])], none, SATURDAY);
    expect(a.items).toEqual([]);
    expect(a.next[0]).toMatchObject({ date: '2026-11-16', moduleName: 'A', minutes: 120 });
  });

  it('ignora planos encerrados, de curso e com tudo concluído', () => {
    const a = buildFocusModuleAgenda(
      [
        plan([row('a', 'c1', 3, 1)], { id: 'old', end_date: '2026-11-01' }),
        plan([row('b', 'c1', 3, 1)], { id: 'course', planning_type: 'course' }),
        plan([row('c', 'c1', 3, 1, { is_completed: true })], { id: 'done' }),
      ],
      none,
      MONDAY,
    );
    expect(a.items).toEqual([]);
    expect(a.activePlans).toBe(0);
  });

  it('plano sem prazo continua valendo depois da data final', () => {
    const a = buildFocusModuleAgenda(
      [plan([row('a', 'c1', 3, 1)], { end_date: '2026-11-01', no_deadline: true })],
      none,
      MONDAY,
    );
    expect(a.items).toHaveLength(1);
  });
});

describe('suggestedSessionMinutes', () => {
  it('usa o que falta hoje', () => {
    expect(suggestedSessionMinutes({ remainingTodayMinutes: 40, moduleMinutes: 300, studiedTotalMinutes: 0 })).toBe(40);
  });
  it('meta do dia feita: sessão extra de 25 min, limitada ao que falta do módulo', () => {
    expect(suggestedSessionMinutes({ remainingTodayMinutes: 0, moduleMinutes: 300, studiedTotalMinutes: 120 })).toBe(25);
    expect(suggestedSessionMinutes({ remainingTodayMinutes: 0, moduleMinutes: 300, studiedTotalMinutes: 290 })).toBe(10);
  });
});

describe('splitStudiedMinutes', () => {
  it('separa minutos de hoje e de antes por módulo e ignora sessões sem módulo', () => {
    const r = splitStudiedMinutes(
      [
        { module_id: 'a', duration_minutes: 30, completed_at: new Date(2026, 10, 8, 20).toISOString() },
        { module_id: 'a', duration_minutes: 25, completed_at: new Date(2026, 10, 9, 8).toISOString() },
        { module_id: null, duration_minutes: 50, completed_at: new Date(2026, 10, 9, 8).toISOString() },
      ],
      MONDAY,
    );
    expect(r).toEqual({ beforeToday: { a: 30 }, today: { a: 25 } });
  });
});
