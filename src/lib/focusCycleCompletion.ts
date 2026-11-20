/**
 * Decide se o fim de um ciclo do Foco é real e se merece aviso (som +
 * notificação do sistema). Regras puras, cobertas por testes.
 *
 * Avisos falsos aconteciam quando:
 * - o cronômetro "terminava" sem um horário de término válido (ex.: apertar
 *   Iniciar com 00:00 depois de um ciclo concluído);
 * - outra aba/janela do app já tinha pausado, zerado ou concluído o mesmo ciclo;
 * - o computador voltava da suspensão muito depois do fim do ciclo.
 */

/** Atraso máximo para ainda avisar; depois disso o ciclo é registrado em silêncio. */
export const LATE_NOTIFY_MS = 60_000;
/** Tolerância para relógios/ticks: antes disso o ciclo ainda não acabou. */
export const EARLY_TOLERANCE_MS = 1_000;

export type CycleCompletionCheck =
  /** Ciclo terminou agora: registra e avisa. */
  | 'complete'
  /** Ciclo terminou há muito tempo (suspensão): registra sem avisar. */
  | 'complete_silent'
  /** Ainda falta tempo: continua contando, sem avisar. */
  | 'not_finished'
  /** Não há ciclo em andamento: apenas para, sem registrar nem avisar. */
  | 'no_cycle'
  /** Outra aba mudou ou já concluiu este ciclo: adota o estado salvo, sem avisar. */
  | 'stale';

export function checkCycleCompletion(args: {
  /** Horário de término do ciclo nesta aba (ms), ou null. */
  targetEndTime: number | null;
  now: number;
  /** Horário de término salvo (compartilhado entre abas); undefined = sem estado salvo. */
  storedTargetEndTime: number | null | undefined;
  /** Último ciclo já concluído por qualquer aba (ms), ou null. */
  claimedTarget: number | null;
}): CycleCompletionCheck {
  const { targetEndTime, now, storedTargetEndTime, claimedTarget } = args;
  if (!targetEndTime) return 'no_cycle';
  if (now < targetEndTime - EARLY_TOLERANCE_MS) return 'not_finished';
  if (claimedTarget === targetEndTime) return 'stale';
  if (storedTargetEndTime !== undefined && storedTargetEndTime !== targetEndTime) return 'stale';
  if (now - targetEndTime > LATE_NOTIFY_MS) return 'complete_silent';
  return 'complete';
}

/** Dia local (AAAA-MM-DD) usado nas chaves de comemoração. */
export function localDayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * "Todos os ciclos completos" / "Meta diária atingida" aparecem uma vez por curso
 * por dia. Antes reapareciam a cada vez que a página Foco era aberta (ou o curso
 * trocado) depois que a meta já tinha sido batida. Retorna true só na primeira vez.
 */
export function claimFocusCelebration(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  kind: 'cycles' | 'daily_goal',
  courseId: string,
  date: Date,
): boolean {
  if (!courseId) return false;
  const key = `fdplanner_focus_celebrated:${kind}:${courseId}:${localDayKey(date)}`;
  try {
    if (storage.getItem(key)) return false;
    storage.setItem(key, '1');
  } catch {
    // sem armazenamento: comemora (não há como lembrar)
  }
  return true;
}
