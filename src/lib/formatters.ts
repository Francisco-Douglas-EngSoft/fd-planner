/**
 * Formatters Library
 * Centraliza todas as funções de formatação para evitar duplicação
 */

import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata minutos em formato legível (Xh Ymin)
 */
export const formatTime = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes < 0) return '0min';
  
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
};

/**
 * Formata horas em formato HH:MM:SS
 */
export const formatHoursToHMS = (hours: number): string => {
  if (!Number.isFinite(hours) || hours < 0) return '00:00:00';
  
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Formata minutos em formato HH:MM:SS
 */
export const formatMinutesToHMS = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes < 0) return '00:00:00';
  
  const totalSeconds = Math.round(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Formata segundos em formato HH:MM:SS
 */
export const formatSecondsToHMS = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00:00';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Formata data em formato legível
 */
export const formatDate = (dateStr: string, formatStr: string = "dd MMM yyyy, HH:mm"): string => {
  if (!dateStr) return '—';
  
  const date = parseISO(dateStr);
  if (!isValid(date)) return '—';
  
  return format(date, formatStr, { locale: ptBR });
};

/**
 * Obtém iniciais de um nome
 */
export const getInitials = (name: string | null): string => {
  if (!name || !name.trim()) return 'U';
  
  const names = name.trim().split(' ').filter(n => n.length > 0);
  
  if (names.length >= 2) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  
  return name.slice(0, 2).toUpperCase();
};

/**
 * Formata porcentagem
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Formata número com separador de milhares
 */
export const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(value);
};
