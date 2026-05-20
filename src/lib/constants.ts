/**
 * Constants Library
 * Centraliza todas as constantes para evitar duplicação
 */

/**
 * Mapeamento de dias da semana (número -> ID)
 */
export const DAY_ID_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
} as const;

/**
 * Mapeamento de dias da semana (ID -> nome em português)
 */
export const DAY_NAMES: Record<string, string> = {
  sunday: 'Domingo',
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
} as const;

/**
 * Emojis de humor
 */
export const MOOD_EMOJIS: Record<string, string> = {
  'focused': '🎯',
  'confused': '🤔',
  'excited': '🚀',
  'tired': '😴',
  'neutral': '😐',
  'great': '⚡',
  'good': '❤️',
  'frustrated': '😤',
} as const;

/**
 * Cores para gráficos
 */
export const CHART_COLORS = [
  'hsl(217, 91%, 60%)',  // Blue
  'hsl(142, 71%, 45%)',  // Green
  'hsl(262, 83%, 58%)',  // Purple
  'hsl(38, 92%, 50%)',   // Orange
  'hsl(340, 82%, 52%)',  // Pink
  'hsl(200, 89%, 48%)',  // Cyan
] as const;

/**
 * Categorias de cursos
 */
export const COURSE_CATEGORIES = [
  'Programação',
  'Design',
  'Marketing',
  'Negócios',
  'Faculdades',
  'Idiomas',
  'Outros',
] as const;

/**
 * Prioridades de tarefas
 */
export const TASK_PRIORITIES = {
  high: { label: 'Alta', color: 'hsl(340, 82%, 52%)' },
  normal: { label: 'Normal', color: 'hsl(38, 92%, 50%)' },
  low: { label: 'Baixa', color: 'hsl(142, 71%, 45%)' },
} as const;

/**
 * Status de tarefas
 */
export const TASK_STATUS = {
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  completed: 'Concluída',
  cancelled: 'Cancelada',
} as const;

/**
 * Limites de validação
 */
export const VALIDATION_LIMITS = {
  MIN_NAME_LENGTH: 3,
  MAX_NAME_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 0,
  MAX_DESCRIPTION_LENGTH: 500,
  MIN_DAILY_HOURS: 0.5,
  MAX_DAILY_HOURS: 24,
  MIN_YEAR: 1900,
  MAX_YEAR: 2100,
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
} as const;

/**
 * Tipos de sessão de foco
 */
export const SESSION_TYPES = {
  work: 'Trabalho',
  break: 'Pausa Curta',
  longBreak: 'Pausa Longa',
} as const;

/**
 * Períodos de relatório
 */
export const REPORT_PERIODS = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
} as const;
