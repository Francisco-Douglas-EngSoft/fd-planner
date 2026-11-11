import { describe, it, expect } from 'vitest';
import {
  buildModuleSchedule,
  buildWeeklyTemplate,
  suggestLaneDays,
  encodeLaneDays,
  decodeLaneDays,
  type ScheduleModule,
} from '../moduleSchedule';

// 09/11/2026 é uma segunda-feira.
const MONDAY = new Date(2026, 10, 9);
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const mod = (id: string, courseId: string, hours: number, order: number, done = false): ScheduleModule => ({
  id,
  name: id,
  courseId,
  courseName: courseId,
  hours,
  order,
  done,
});

describe('buildModuleSchedule — em sequência', () => {
  it('estuda um módulo por vez e o tempo que sobra já começa o próximo', () => {
    const r = buildModuleSchedule([mod('a', 'c1', 3, 1), mod('b', 'c1', 2, 2)], {
      startDate: MONDAY,
      studyDays: WEEKDAYS,
      dailyHours: 2,
      mode: 'sequence',
    });
    // seg: A 2h | ter: A 1h + B 1h | qua: B 1h
    expect(r.projections.a).toEqual({ start: '2026-11-09', end: '2026-11-10', sessions: 2 });
    expect(r.projections.b).toEqual({ start: '2026-11-10', end: '2026-11-11', sessions: 2 });
    expect(r.days[1].items).toEqual([
      { moduleId: 'a', courseId: 'sequence', minutes: 60 },
      { moduleId: 'b', courseId: 'sequence', minutes: 60 },
    ]);
    expect(r.finishDate).toBe('2026-11-11');
  });

  it('pula dias que não são de estudo', () => {
    const r = buildModuleSchedule([mod('a', 'c1', 4, 1)], {
      startDate: MONDAY,
      studyDays: ['monday', 'friday'],
      dailyHours: 2,
      mode: 'sequence',
    });
    expect(r.days.map((d) => d.date)).toEqual(['2026-11-09', '2026-11-13']);
  });

  it('ignora módulos já concluídos', () => {
    const r = buildModuleSchedule([mod('a', 'c1', 10, 1, true), mod('b', 'c1', 2, 2)], {
      startDate: MONDAY,
      studyDays: WEEKDAYS,
      dailyHours: 2,
      mode: 'sequence',
    });
    expect(r.projections.a.start).toBeNull();
    expect(r.finishDate).toBe('2026-11-09');
  });
});

describe('buildModuleSchedule — por dias da semana', () => {
  it('cada curso só é estudado nos dias escolhidos para ele', () => {
    const r = buildModuleSchedule([mod('m1', 'mat', 4, 1), mod('p1', 'port', 4, 2)], {
      startDate: MONDAY,
      studyDays: WEEKDAYS,
      dailyHours: 2,
      mode: 'weekly',
      lanes: { mat: { days: ['monday', 'wednesday'] }, port: { days: ['tuesday', 'thursday'] } },
    });
    expect(r.days.filter((d) => d.items.some((i) => i.courseId === 'mat')).map((d) => d.dayId)).toEqual([
      'monday',
      'wednesday',
    ]);
    expect(r.projections.p1).toEqual({ start: '2026-11-10', end: '2026-11-12', sessions: 2 });
  });

  it('divide a meta diária igualmente entre os cursos do mesmo dia', () => {
    const r = buildModuleSchedule([mod('m1', 'mat', 10, 1), mod('p1', 'port', 10, 2)], {
      startDate: MONDAY,
      studyDays: WEEKDAYS,
      dailyHours: 2,
      mode: 'weekly',
    });
    expect(r.days[0].items.map((i) => i.minutes)).toEqual([60, 60]);
  });

  it('curso com tempo fixo recebe esse tempo e o resto vai para os outros', () => {
    const r = buildModuleSchedule([mod('m1', 'mat', 10, 1), mod('p1', 'port', 10, 2)], {
      startDate: MONDAY,
      studyDays: WEEKDAYS,
      dailyHours: 2,
      mode: 'weekly',
      lanes: { mat: { sessionHours: 1.5 } },
    });
    const first = Object.fromEntries(r.days[0].items.map((i) => [i.courseId, i.minutes]));
    expect(first).toEqual({ mat: 90, port: 30 });
  });

  it('módulos do mesmo curso seguem em ordem na trilha do curso', () => {
    const r = buildModuleSchedule([mod('m2', 'mat', 1, 2), mod('m1', 'mat', 1, 1)], {
      startDate: MONDAY,
      studyDays: WEEKDAYS,
      dailyHours: 1,
      mode: 'weekly',
    });
    expect(r.projections.m1.end).toBe('2026-11-09');
    expect(r.projections.m2.start).toBe('2026-11-10');
  });

  it('sobra de um curso que terminou no dia vai para o outro curso do dia', () => {
    const r = buildModuleSchedule([mod('m1', 'mat', 0.5, 1), mod('p1', 'port', 5, 2)], {
      startDate: MONDAY,
      studyDays: WEEKDAYS,
      dailyHours: 2,
      mode: 'weekly',
    });
    const first = Object.fromEntries(r.days[0].items.map((i) => [i.courseId, i.minutes]));
    expect(first).toEqual({ mat: 30, port: 90 });
  });

  it('curso sem nenhum dia fica de fora e não há data final', () => {
    const r = buildModuleSchedule([mod('m1', 'mat', 2, 1), mod('p1', 'port', 2, 2)], {
      startDate: MONDAY,
      studyDays: WEEKDAYS,
      dailyHours: 2,
      mode: 'weekly',
      lanes: { mat: { days: [] } },
    });
    expect(r.unscheduledModuleIds).toEqual(['m1']);
    expect(r.finishDate).toBeNull();
  });
});

describe('buildWeeklyTemplate', () => {
  it('mostra quanto cada curso recebe em cada dia da semana', () => {
    const t = buildWeeklyTemplate([mod('m1', 'mat', 10, 1), mod('p1', 'port', 10, 2)], {
      startDate: MONDAY,
      studyDays: WEEKDAYS,
      dailyHours: 2,
      mode: 'weekly',
      lanes: { mat: { days: ['monday', 'wednesday'] } },
    });
    expect(t.monday.map((e) => [e.courseId, e.minutes])).toEqual([
      ['mat', 60],
      ['port', 60],
    ]);
    expect(t.tuesday.map((e) => [e.courseId, e.minutes])).toEqual([['port', 120]]);
    expect(t.saturday).toEqual([]);
  });
});

describe('suggestLaneDays', () => {
  it('dá mais dias ao curso com mais horas e alterna os dias', () => {
    const r = suggestLaneDays(
      [
        { courseId: 'big', hours: 40 },
        { courseId: 'small', hours: 10 },
      ],
      WEEKDAYS,
    );
    expect(r.big).toEqual(['monday', 'wednesday', 'thursday', 'friday']);
    expect(r.small).toEqual(['tuesday']);
  });

  it('com mais cursos que dias, cada curso recebe um dia', () => {
    const r = suggestLaneDays(
      [
        { courseId: 'a', hours: 3 },
        { courseId: 'b', hours: 2 },
        { courseId: 'c', hours: 1 },
      ],
      ['monday', 'tuesday'],
    );
    expect(r).toEqual({ a: ['monday'], b: ['tuesday'], c: ['monday'] });
  });
});

describe('encodeLaneDays / decodeLaneDays', () => {
  it('guarda os dias em ordem da semana e lê de volta', () => {
    expect(encodeLaneDays(['friday', 'monday'])).toBe('monday,friday');
    expect(decodeLaneDays('monday,friday')).toEqual(['monday', 'friday']);
    expect(decodeLaneDays('tuesday')).toEqual(['tuesday']);
    expect(encodeLaneDays([])).toBeNull();
  });
});

import { planToScheduleInput, type PlanModuleRow } from '../modulePlanAdapter';

const row = (p: Partial<PlanModuleRow>): PlanModuleRow => ({
  id: p.module_id ?? 'r',
  module_id: null,
  course_id: 'c1',
  module_name: 'M',
  module_hours: 2,
  allocated_hours: 2,
  sequence_order: 1,
  is_completed: false,
  day_id: null,
  daily_hours: null,
  time_slot: null,
  ...p,
});

describe('planToScheduleInput', () => {
  it('plano salvo com dias por curso abre no modo "por dias da semana"', () => {
    const r = planToScheduleInput({
      planning_type: 'module',
      start_date: '2026-11-09',
      daily_hours: 2,
      study_days: WEEKDAYS,
      study_plan_modules: [row({ module_id: 'a', day_id: 'monday,wednesday', daily_hours: 1 })],
    })!;
    expect(r.mode).toBe('weekly');
    expect(r.options.lanes!.c1).toEqual({ days: ['monday', 'wednesday'], sessionHours: 1, timeSlot: null });
  });

  it('plano antigo sem dias salvos abre "em sequência" e projeta a partir de hoje', () => {
    const r = planToScheduleInput(
      {
        planning_type: 'module',
        start_date: '2026-01-05',
        daily_hours: 2,
        study_days: WEEKDAYS,
        study_plan_modules: [row({ module_id: 'a' })],
      },
      new Date(2026, 10, 10),
    )!;
    expect(r.mode).toBe('sequence');
    expect(r.options.startDate).toEqual(new Date(2026, 10, 10));
  });
});
