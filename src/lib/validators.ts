/**
 * Validators Library
 * Centraliza todas as validações usando Zod
 */

import { z } from 'zod';
import { isValid, parseISO } from 'date-fns';
import { VALIDATION_LIMITS } from './constants';

/**
 * Validador de data ISO
 */
const dateString = z.string().refine(
  (date) => {
    const parsed = parseISO(date);
    if (!isValid(parsed)) return false;
    
    const year = parsed.getFullYear();
    return year >= VALIDATION_LIMITS.MIN_YEAR && year <= VALIDATION_LIMITS.MAX_YEAR;
  },
  { message: `Data deve estar entre ${VALIDATION_LIMITS.MIN_YEAR} e ${VALIDATION_LIMITS.MAX_YEAR}` }
);

/**
 * Schema de validação para planejamento
 */
export const planSchema = z.object({
  name: z.string()
    .min(VALIDATION_LIMITS.MIN_NAME_LENGTH, `Nome deve ter no mínimo ${VALIDATION_LIMITS.MIN_NAME_LENGTH} caracteres`)
    .max(VALIDATION_LIMITS.MAX_NAME_LENGTH, `Nome deve ter no máximo ${VALIDATION_LIMITS.MAX_NAME_LENGTH} caracteres`)
    .trim(),
  
  description: z.string()
    .max(VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH, `Descrição deve ter no máximo ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} caracteres`)
    .optional()
    .nullable(),
  
  startDate: dateString,
  
  endDate: dateString,
  
  dailyHours: z.number()
    .min(VALIDATION_LIMITS.MIN_DAILY_HOURS, `Mínimo ${VALIDATION_LIMITS.MIN_DAILY_HOURS} horas`)
    .max(VALIDATION_LIMITS.MAX_DAILY_HOURS, `Máximo ${VALIDATION_LIMITS.MAX_DAILY_HOURS} horas`),
  
  studyDays: z.array(z.string()).min(1, 'Selecione pelo menos um dia'),
  
  planningCategory: z.enum(['regular', 'faculdade']),
}).refine(
  (data) => parseISO(data.endDate) > parseISO(data.startDate),
  {
    message: 'Data final deve ser posterior à data inicial',
    path: ['endDate'],
  }
).refine(
  (data) => {
    const start = parseISO(data.startDate);
    const end = parseISO(data.endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 1 && diffDays <= 3650; // Entre 1 dia e 10 anos
  },
  {
    message: 'Período deve estar entre 1 dia e 10 anos',
    path: ['endDate'],
  }
);

/**
 * Schema de validação para curso
 */
export const courseSchema = z.object({
  name: z.string()
    .min(VALIDATION_LIMITS.MIN_NAME_LENGTH, `Nome deve ter no mínimo ${VALIDATION_LIMITS.MIN_NAME_LENGTH} caracteres`)
    .max(VALIDATION_LIMITS.MAX_NAME_LENGTH, `Nome deve ter no máximo ${VALIDATION_LIMITS.MAX_NAME_LENGTH} caracteres`)
    .trim(),
  
  description: z.string()
    .max(VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH, `Descrição deve ter no máximo ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} caracteres`)
    .optional()
    .nullable(),
  
  totalHours: z.number()
    .min(0.5, 'Mínimo 0.5 horas')
    .max(10000, 'Máximo 10000 horas'),
  
  category: z.string().optional().nullable(),
});

/**
 * Schema de validação para nota
 */
export const noteSchema = z.object({
  title: z.string()
    .min(VALIDATION_LIMITS.MIN_NAME_LENGTH, `Título deve ter no mínimo ${VALIDATION_LIMITS.MIN_NAME_LENGTH} caracteres`)
    .max(VALIDATION_LIMITS.MAX_NAME_LENGTH, `Título deve ter no máximo ${VALIDATION_LIMITS.MAX_NAME_LENGTH} caracteres`)
    .trim(),
  
  content: z.string().optional().nullable(),
  
  courseId: z.string().uuid().optional().nullable(),
  
  mood: z.string().optional().nullable(),
  
  tags: z.array(z.string()).optional().nullable(),
});

/**
 * Schema de validação para tarefa
 */
export const taskSchema = z.object({
  title: z.string()
    .min(VALIDATION_LIMITS.MIN_NAME_LENGTH, `Título deve ter no mínimo ${VALIDATION_LIMITS.MIN_NAME_LENGTH} caracteres`)
    .max(VALIDATION_LIMITS.MAX_NAME_LENGTH, `Título deve ter no máximo ${VALIDATION_LIMITS.MAX_NAME_LENGTH} caracteres`)
    .trim(),
  
  description: z.string()
    .max(VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH, `Descrição deve ter no máximo ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} caracteres`)
    .optional()
    .nullable(),
  
  dueDate: dateString.optional().nullable(),
  
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  
  courseId: z.string().uuid().optional().nullable(),
});

/**
 * Schema de validação para perfil
 */
export const profileSchema = z.object({
  fullName: z.string()
    .min(VALIDATION_LIMITS.MIN_NAME_LENGTH, `Nome deve ter no mínimo ${VALIDATION_LIMITS.MIN_NAME_LENGTH} caracteres`)
    .max(VALIDATION_LIMITS.MAX_NAME_LENGTH, `Nome deve ter no máximo ${VALIDATION_LIMITS.MAX_NAME_LENGTH} caracteres`)
    .trim(),
  
  bio: z.string()
    .max(VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH, `Bio deve ter no máximo ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} caracteres`)
    .optional()
    .nullable(),
});

/**
 * Schema de validação para senha
 */
export const passwordSchema = z.object({
  newPassword: z.string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres'),
  
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  }
);

/**
 * Valida arquivo de imagem
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > VALIDATION_LIMITS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo ${VALIDATION_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Apenas imagens são permitidas',
    };
  }
  
  return { valid: true };
};

/**
 * Valida e formata data
 */
export const validateAndFormatDate = (dateStr: string): string | null => {
  const date = parseISO(dateStr);
  
  if (!isValid(date)) return null;
  
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Verifica se ano está no range válido
  if (year < VALIDATION_LIMITS.MIN_YEAR || year > VALIDATION_LIMITS.MAX_YEAR) {
    return null;
  }
  
  // Verifica se a data é válida (não aceita 30 de fevereiro, etc)
  const reconstructed = new Date(year, month, day);
  if (reconstructed.getFullYear() !== year || 
      reconstructed.getMonth() !== month || 
      reconstructed.getDate() !== day) {
    return null;
  }
  
  return dateStr;
};
