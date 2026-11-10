/**
 * Regras puras dos lembretes da Rotina Diária.
 * Um lembrete é uma ocorrência (tarefa, dia): só existe nos dias em que a
 * tarefa se repete, com a tarefa ativa e o lembrete ligado.
 */
import { deISO, diaDaSemana, horaParaMinutos, paraISO, somarDias } from './datas';
import type { RotinaTarefa } from './tipos';

/** Opções de antecedência oferecidas na tela (minutos). */
export const ANTECEDENCIAS = [0, 5, 10, 15, 30, 60] as const;

/** Até quantos minutos depois do horário um aviso atrasado ainda é mostrado
 *  (ex.: o app foi aberto pouco depois do horário). */
export const TOLERANCIA_MIN = 10;

export function rotuloAntecedencia(min: number): string {
  if (min <= 0) return 'Na hora';
  if (min < 60) return `${min} min antes`;
  return min === 60 ? '1 hora antes' : `${Math.round(min / 60)} h antes`;
}

export interface OcorrenciaLembrete {
  tarefa: RotinaTarefa;
  /** Dia da tarefa ("AAAA-MM-DD"), não necessariamente o dia do aviso. */
  data: string;
  /** Momento do aviso. */
  quando: Date;
  /** Identifica a ocorrência para não avisar duas vezes. */
  chave: string;
}

export const chaveLembrete = (tarefaId: string, data: string) => `${tarefaId}|${data}`;

/** A tarefa tem lembrete nesse dia? (ativa, lembrete ligado e dia da semana previsto) */
export function temLembreteNoDia(tarefa: RotinaTarefa, data: string): boolean {
  return tarefa.ativa && tarefa.lembrete_ativo && tarefa.dias_semana.includes(diaDaSemana(data));
}

/** Momento do aviso da tarefa no dia informado (horário − antecedência, fuso local). */
export function momentoDoLembrete(tarefa: RotinaTarefa, data: string): Date {
  const d = deISO(data);
  d.setMinutes(horaParaMinutos(tarefa.hora) - Math.max(0, tarefa.lembrete_min_antes || 0));
  return d;
}

/** Ocorrências de ontem, hoje e amanhã (cobre antecedências que cruzam a meia-noite). */
function ocorrenciasProximas(tarefas: RotinaTarefa[], agora: Date): OcorrenciaLembrete[] {
  const hoje = paraISO(agora);
  const dias = [somarDias(hoje, -1), hoje, somarDias(hoje, 1)];
  const lista: OcorrenciaLembrete[] = [];
  for (const tarefa of tarefas) {
    for (const data of dias) {
      if (!temLembreteNoDia(tarefa, data)) continue;
      lista.push({ tarefa, data, quando: momentoDoLembrete(tarefa, data), chave: chaveLembrete(tarefa.id, data) });
    }
  }
  return lista.sort((a, b) => a.quando.getTime() - b.quando.getTime());
}

/** Lembretes que devem ser mostrados agora e ainda não foram enviados. */
export function lembretesVencidos(
  tarefas: RotinaTarefa[],
  agora: Date,
  enviados: ReadonlySet<string>,
  toleranciaMin = TOLERANCIA_MIN,
): OcorrenciaLembrete[] {
  const t = agora.getTime();
  return ocorrenciasProximas(tarefas, agora).filter(
    (o) => !enviados.has(o.chave) && o.quando.getTime() <= t && t - o.quando.getTime() <= toleranciaMin * 60_000,
  );
}

/** Próximo momento de aviso depois de `agora` (ou null se não houver nas próximas 24h). */
export function proximoLembrete(tarefas: RotinaTarefa[], agora: Date): Date | null {
  const t = agora.getTime();
  return ocorrenciasProximas(tarefas, agora).find((o) => o.quando.getTime() > t)?.quando ?? null;
}

/** Texto do aviso. */
export function textoDoLembrete(o: OcorrenciaLembrete): { titulo: string; corpo: string } {
  const antes = o.tarefa.lembrete_min_antes > 0;
  return {
    titulo: antes ? `⏰ Em ${rotuloAntecedencia(o.tarefa.lembrete_min_antes).replace(' antes', '')}: ${o.tarefa.nome}` : `⏰ ${o.tarefa.nome}`,
    corpo: antes ? `Sua tarefa da rotina começa às ${o.tarefa.hora}.` : `Está na hora (${o.tarefa.hora}) da sua tarefa da rotina.`,
  };
}
