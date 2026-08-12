/**
 * Study Pace Calculator
 * Centraliza os cálculos de cronograma, prazos e ritmo de estudo
 * para cursos e módulos dentro de planejamentos.
 */

import { addDays, differenceInDays, isValid, parseISO } from 'date-fns';

export type PaceLevel = 'min' | 'ideal' | 'max';

export interface PaceConfig {
  /** Horas/dia para o ritmo mínimo (padrão: 50% do daily_hours) */
  min: number;
  /** Horas/dia para o ritmo ideal (padrão: 100% do daily_hours) */
  ideal: number;
  /** Horas/dia para o ritmo máximo (padrão: 150% do daily_hours) */
  max: number;
}

export interface PaceProjection {
  level: PaceLevel;
  hoursPerDay: number;
  /** Cenário realista: considera apenas os dias de estudo da semana */
  realisticEndDate: Date | null;
  realisticDays: number;
  /** Cenário otimista: considera todos os dias corridos */
  optimisticEndDate: Date | null;
  optimisticDays: number;
}

export interface CourseSchedule {
  startDate: Date;
  totalHours: number;
  remainingHours: number;
  completedHours: number;
  projections: Record<PaceLevel, PaceProjection>;
}

export interface ModuleSchedule {
  id: string;
  name: string;
  hours: number;
  isCompleted: boolean;
  startDate: Date;
  /** Datas previstas em cada cenário (ritmo ideal por padrão) */
  endDates: Record<PaceLevel, Date | null>;
  cumulativeHours: number;
}

/** Indica se o usuário está adiantado, no prazo ou atrasado vs ideal */
export type PaceStatus = 'ahead' | 'on-track' | 'behind' | 'unknown';

export interface PaceIndicator {
  status: PaceStatus;
  /** Diferença em horas entre o esperado e o realizado (positivo = adiantado) */
  diffHours: number;
  /** Percentual em relação ao esperado */
  percentage: number;
  expectedHours: number;
  actualHours: number;
}

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const safeParseISO = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
};

/**
 * Deriva config de min/ideal/max a partir do daily_hours do plano.
 * Quando o usuário define explicitamente min_daily_hours / max_daily_hours
 * na criação do planejamento, esses valores são respeitados.
 * Caso contrário, fallback: min = 50%, max = 150% do ideal.
 */
export function derivePaceConfig(
  dailyHours: number,
  overrides?: { min?: number | null; max?: number | null },
): PaceConfig {
  const ideal = Math.max(0.25, dailyHours);
  
  // Use explicit overrides if provided and valid (> 0)
  const min =
    typeof overrides?.min === 'number' && overrides.min > 0
      ? Math.max(0.1, overrides.min)
      : Math.max(0.1, ideal * 0.5);
      
  const max =
    typeof overrides?.max === 'number' && overrides.max > 0
      ? Math.max(min, overrides.max)
      : Math.max(ideal, ideal * 1.5);

  return { min, ideal, max };
}

/**
 * Calcula a data final no cenário REALISTA (apenas dias de estudo selecionados).
 * Retorna null se não houver dias válidos.
 */
export function projectRealisticEndDate(
  startDate: Date,
  remainingHours: number,
  hoursPerDay: number,
  studyDays: string[],
): { date: Date | null; days: number } {
  if (remainingHours <= 0 || hoursPerDay <= 0) {
    return { date: startDate, days: 0 };
  }
  if (!studyDays || studyDays.length === 0) {
    return { date: null, days: 0 };
  }

  const allowed = new Set(studyDays.map((d) => DAY_MAP[d]).filter((n) => n !== undefined));
  if (allowed.size === 0) return { date: null, days: 0 };

  const totalStudyDaysNeeded = Math.ceil(remainingHours / hoursPerDay);
  let current = new Date(startDate);
  let counted = 0;
  let calendarDays = 0;
  const SAFETY_LIMIT = 365 * 10; // 10 anos

  while (counted < totalStudyDaysNeeded && calendarDays < SAFETY_LIMIT) {
    if (allowed.has(current.getDay())) {
      counted++;
      if (counted === totalStudyDaysNeeded) {
        return { date: new Date(current), days: calendarDays };
      }
    }
    current = addDays(current, 1);
    calendarDays++;
  }

  return { date: null, days: calendarDays };
}

/**
 * Calcula a data final no cenário OTIMISTA (todos os dias corridos).
 */
export function projectOptimisticEndDate(
  startDate: Date,
  remainingHours: number,
  hoursPerDay: number,
): { date: Date; days: number } {
  if (remainingHours <= 0 || hoursPerDay <= 0) {
    return { date: startDate, days: 0 };
  }
  const days = Math.ceil(remainingHours / hoursPerDay);
  return { date: addDays(startDate, Math.max(0, days - 1)), days };
}

/**
 * Gera as 3 projeções (min/ideal/max) para um curso, com ambos os cenários.
 */
export function buildCourseSchedule(params: {
  startDate: string | Date;
  totalHours: number;
  completedHours?: number;
  paceConfig: PaceConfig;
  studyDays: string[];
  /** Data de referência para projetar as datas de conclusão. Default: hoje. */
  today?: Date;
}): CourseSchedule {
  const planStart = safeParseISO(params.startDate) ?? new Date();
  const today = params.today ?? new Date();
  // Normaliza "hoje" sem hora para evitar drift dentro do mesmo dia
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Projeção sempre a partir de hoje (ou da data de início do plano, se for futura)
  const projectionStart = todayMidnight.getTime() > planStart.getTime() ? todayMidnight : planStart;
  const totalHours = Math.max(0, params.totalHours || 0);
  const completedHours = Math.max(0, Math.min(totalHours, params.completedHours || 0));
  const remainingHours = Math.max(0, totalHours - completedHours);

  const buildProjection = (level: PaceLevel, hoursPerDay: number): PaceProjection => {
    const realistic = projectRealisticEndDate(projectionStart, remainingHours, hoursPerDay, params.studyDays);
    const optimistic = projectOptimisticEndDate(projectionStart, remainingHours, hoursPerDay);
    return {
      level,
      hoursPerDay,
      realisticEndDate: realistic.date,
      realisticDays: realistic.days,
      optimisticEndDate: optimistic.date,
      optimisticDays: optimistic.days,
    };
  };

  return {
    startDate: projectionStart,
    totalHours,
    remainingHours,
    completedHours,
    projections: {
      min: buildProjection('min', params.paceConfig.min),
      ideal: buildProjection('ideal', params.paceConfig.ideal),
      max: buildProjection('max', params.paceConfig.max),
    },
  };
}

/**
 * Calcula cronograma para cada módulo de um curso, distribuindo as horas
 * sequencialmente (módulos rodam em série) a partir da data inicial.
 *
 * As datas de fim por nível são baseadas nas horas acumuladas até cada módulo.
 */
export function buildModuleSchedule(params: {
  startDate: string | Date;
  modules: Array<{ id: string; name: string; hours: number; isCompleted?: boolean }>;
  paceConfig: PaceConfig;
  studyDays: string[];
}): ModuleSchedule[] {
  const start = safeParseISO(params.startDate) ?? new Date();
  let cumulativeHours = 0;
  let cumulativeRemaining = 0;

  return params.modules.map((mod) => {
    const moduleHours = Math.max(0, mod.hours || 0);
    const isCompleted = !!mod.isCompleted;

    // Início do módulo: depois de todos os módulos anteriores não-concluídos
    const previousRemaining = cumulativeRemaining;

    const moduleStartIdeal = (() => {
      if (previousRemaining <= 0) return start;
      const r = projectRealisticEndDate(
        start,
        previousRemaining,
        params.paceConfig.ideal,
        params.studyDays,
      );
      return r.date ? addDays(r.date, 0) : start;
    })();

    cumulativeHours += moduleHours;
    if (!isCompleted) {
      cumulativeRemaining += moduleHours;
    }

    const calcEnd = (hoursPerDay: number): Date | null => {
      if (isCompleted) return moduleStartIdeal;
      const r = projectRealisticEndDate(
        start,
        cumulativeRemaining,
        hoursPerDay,
        params.studyDays,
      );
      return r.date;
    };

    return {
      id: mod.id,
      name: mod.name,
      hours: moduleHours,
      isCompleted,
      startDate: moduleStartIdeal,
      endDates: {
        min: calcEnd(params.paceConfig.min),
        ideal: calcEnd(params.paceConfig.ideal),
        max: calcEnd(params.paceConfig.max),
      },
      cumulativeHours,
    };
  });
}

/**
 * Avalia se o usuário está adiantado/no prazo/atrasado em relação ao ideal.
 * Compara horas estudadas até hoje vs horas esperadas (ideal × dias decorridos de estudo).
 */
export function evaluatePace(params: {
  startDate: string | Date;
  today?: Date;
  actualHours: number;
  idealHoursPerDay: number;
  studyDays: string[];
}): PaceIndicator {
  const start = safeParseISO(params.startDate);
  const today = params.today ?? new Date();
  if (!start || params.idealHoursPerDay <= 0) {
    return {
      status: 'unknown',
      diffHours: 0,
      percentage: 0,
      expectedHours: 0,
      actualHours: params.actualHours,
    };
  }

  const totalDays = Math.max(0, differenceInDays(today, start) + 1);
  if (totalDays <= 0) {
    return {
      status: 'on-track',
      diffHours: 0,
      percentage: 100,
      expectedHours: 0,
      actualHours: params.actualHours,
    };
  }

  // Conta dias de estudo decorridos
  const allowed = new Set(params.studyDays.map((d) => DAY_MAP[d]).filter((n) => n !== undefined));
  let elapsedStudyDays = 0;
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(start, i);
    if (allowed.has(d.getDay())) elapsedStudyDays++;
  }

  const expected = elapsedStudyDays * params.idealHoursPerDay;
  const diff = params.actualHours - expected;
  const percentage = expected > 0 ? Math.round((params.actualHours / expected) * 100) : 100;

  let status: PaceStatus = 'on-track';
  if (expected > 0) {
    if (percentage >= 110) status = 'ahead';
    else if (percentage < 90) status = 'behind';
  }

  return {
    status,
    diffHours: diff,
    percentage,
    expectedHours: expected,
    actualHours: params.actualHours,
  };
}

/**
 * Calcula o esperado da semana (segunda → domingo) e do dia atual,
 * considerando apenas os dias de estudo configurados.
 *
 * A semana sempre começa na segunda-feira 00:00 (reseta automaticamente
 * porque o cálculo deriva da data atual).
 */
export function computeWeeklyExpectation(params: {
  idealHoursPerDay: number;
  studyDays: string[];
  today?: Date;
}): {
  weeklyExpectedHours: number;
  dailyExpectedHours: number;
  studyDaysThisWeek: number;
  isStudyDayToday: boolean;
} {
  const today = params.today ?? new Date();
  const ideal = Math.max(0, params.idealHoursPerDay || 0);
  const allowed = new Set((params.studyDays || []).map((d) => DAY_MAP[d]).filter((n) => n !== undefined));

  // Segunda-feira da semana atual (getDay: 0=Dom, 1=Seg)
  const dayOfWeek = today.getDay();
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offsetToMonday);

  let studyDaysThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    if (allowed.has(d.getDay())) studyDaysThisWeek++;
  }

  const isStudyDayToday = allowed.has(today.getDay());

  return {
    weeklyExpectedHours: studyDaysThisWeek * ideal,
    dailyExpectedHours: isStudyDayToday ? ideal : 0,
    studyDaysThisWeek,
    isStudyDayToday,
  };
}

export function formatHoursHMS(hours: number): string {
  const totalSeconds = Math.round(Math.max(0, hours) * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
