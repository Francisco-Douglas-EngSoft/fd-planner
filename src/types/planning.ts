// Types para o sistema de planejamento de faculdades

export interface DisciplineSchedule {
  moduleId: string;
  moduleName: string;
  moduleHours: number;
  facultyId: string;
  facultyName: string;
  dayId: string;  // UM DIA ESPECÍFICO (não array)
  dailyHours: number;
  timeSlot?: 'morning' | 'afternoon' | 'evening';
  sequenceOrder: number;
}

export interface FacultyWithDisciplines {
  id: string;
  name: string;
  totalHours: number;
  disciplines: Discipline[];
}

export interface Discipline {
  id: string;
  name: string;
  hours: number;
  isCompleted: boolean;
  selectedDays: string[];
  dailyHours: number;
  timeSlot?: 'morning' | 'afternoon' | 'evening';
  sequenceOrder: number;
}

export interface DaySchedule {
  dayId: string;
  dayLabel: string;
  disciplines: DisciplineSchedule[];
  totalHours: number;
}

export interface FacultyPlanningData {
  faculties: FacultyWithDisciplines[];
  schedule: DisciplineSchedule[];
  totalWeeklyHours: number;
  daysSchedule: DaySchedule[];
}

export const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Segunda-feira', abbrev: 'Seg' },
  { id: 'tuesday', label: 'Terça-feira', abbrev: 'Ter' },
  { id: 'wednesday', label: 'Quarta-feira', abbrev: 'Qua' },
  { id: 'thursday', label: 'Quinta-feira', abbrev: 'Qui' },
  { id: 'friday', label: 'Sexta-feira', abbrev: 'Sex' },
  { id: 'saturday', label: 'Sábado', abbrev: 'Sáb' },
  { id: 'sunday', label: 'Domingo', abbrev: 'Dom' },
] as const;

export const TIME_SLOTS = [
  { id: 'morning', label: 'Manhã', icon: '🌅' },
  { id: 'afternoon', label: 'Tarde', icon: '☀️' },
  { id: 'evening', label: 'Noite', icon: '🌙' },
] as const;

export type DayOfWeek = typeof DAYS_OF_WEEK[number]['id'];
export type TimeSlot = typeof TIME_SLOTS[number]['id'];
