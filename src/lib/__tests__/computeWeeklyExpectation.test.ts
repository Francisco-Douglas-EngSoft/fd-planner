/**
 * Validação: "Esperado da Semana" reseta exatamente na segunda-feira 00:00
 * (00:01 ainda está na nova semana) no fuso do usuário.
 *
 * Rodar com: bun test src/lib/__tests__/computeWeeklyExpectation.test.ts
 */
import { describe, expect, it } from 'bun:test';
import { computeWeeklyExpectation } from '../studyPaceCalculator';

const STUDY_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

describe('computeWeeklyExpectation — reset semanal na segunda 00:01', () => {
  it('domingo 23:59 conta a semana anterior (segunda passada → domingo)', () => {
    // Domingo 2025-04-27 às 23:59 (horário local)
    const sunLate = new Date(2025, 3, 27, 23, 59, 0);
    const w = computeWeeklyExpectation({
      idealHoursPerDay: 2,
      studyDays: STUDY_DAYS,
      today: sunLate,
    });
    // Seg→Sex = 5 dias × 2h = 10h
    expect(w.studyDaysThisWeek).toBe(5);
    expect(w.weeklyExpectedHours).toBe(10);
    // Domingo NÃO está em STUDY_DAYS → não é dia de estudo
    expect(w.isStudyDayToday).toBe(false);
    expect(w.dailyExpectedHours).toBe(0);
  });

  it('segunda 00:01 já é a NOVA semana (mesmo total mas semana resetada)', () => {
    // Segunda 2025-04-28 às 00:01
    const monEarly = new Date(2025, 3, 28, 0, 1, 0);
    const w = computeWeeklyExpectation({
      idealHoursPerDay: 2,
      studyDays: STUDY_DAYS,
      today: monEarly,
    });
    expect(w.studyDaysThisWeek).toBe(5);
    expect(w.weeklyExpectedHours).toBe(10);
    expect(w.isStudyDayToday).toBe(true);
    expect(w.dailyExpectedHours).toBe(2);
  });

  it('quarta no meio da semana mantém o total semanal completo', () => {
    const wed = new Date(2025, 3, 30, 14, 0, 0);
    const w = computeWeeklyExpectation({
      idealHoursPerDay: 1.5,
      studyDays: STUDY_DAYS,
      today: wed,
    });
    expect(w.studyDaysThisWeek).toBe(5);
    expect(w.weeklyExpectedHours).toBe(7.5);
  });

  it('respeita dias customizados (sáb+dom apenas)', () => {
    const sat = new Date(2025, 4, 3, 10, 0, 0); // sábado
    const w = computeWeeklyExpectation({
      idealHoursPerDay: 3,
      studyDays: ['saturday', 'sunday'],
      today: sat,
    });
    expect(w.studyDaysThisWeek).toBe(2);
    expect(w.weeklyExpectedHours).toBe(6);
    expect(w.isStudyDayToday).toBe(true);
    expect(w.dailyExpectedHours).toBe(3);
  });

  it('sem dias selecionados → zero esperado', () => {
    const w = computeWeeklyExpectation({
      idealHoursPerDay: 2,
      studyDays: [],
      today: new Date(2025, 3, 30, 10, 0, 0),
    });
    expect(w.studyDaysThisWeek).toBe(0);
    expect(w.weeklyExpectedHours).toBe(0);
    expect(w.isStudyDayToday).toBe(false);
  });
});
