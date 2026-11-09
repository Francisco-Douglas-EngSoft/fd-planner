/**
 * Regras de cálculo da Rotina Diária (funções puras, testadas em __tests__/calculos.test.ts).
 *
 * Uma tarefa entra no dia D quando: está ativa, se repete no dia da semana de D
 * e já existia em D (criada até D). Se houver marcação naquele dia, ela entra
 * sempre — assim uma tarefa arquivada não some do histórico já marcado.
 */
import type { ResumoDia, RotinaCategoria, RotinaConclusao, RotinaTarefa } from './tipos';
import {
  dataLocalDeTimestamp,
  diaDaSemana,
  formatarDataBR,
  formatarDataHoraBR,
  horaParaMinutos,
  intervaloDias,
  DIAS_SEMANA_NOME,
} from './datas';

export function ordenarPorHora<T extends Pick<RotinaTarefa, 'hora' | 'ordem' | 'nome'>>(tarefas: T[]): T[] {
  return [...tarefas].sort(
    (a, b) =>
      horaParaMinutos(a.hora) - horaParaMinutos(b.hora) ||
      a.ordem - b.ordem ||
      a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}

/** Agrupa as marcações por dia: data → conjunto de ids de tarefa concluídas. */
export function indexarConclusoes(conclusoes: RotinaConclusao[]): Map<string, Set<string>> {
  const mapa = new Map<string, Set<string>>();
  for (const c of conclusoes) {
    let set = mapa.get(c.data);
    if (!set) {
      set = new Set();
      mapa.set(c.data, set);
    }
    set.add(c.tarefa_id);
  }
  return mapa;
}

export function tarefasDoDia(
  tarefas: RotinaTarefa[],
  data: string,
  concluidasNoDia: Set<string> = new Set(),
): RotinaTarefa[] {
  const dow = diaDaSemana(data);
  return ordenarPorHora(
    tarefas.filter(
      (t) =>
        concluidasNoDia.has(t.id) ||
        (t.ativa && t.dias_semana.includes(dow) && dataLocalDeTimestamp(t.created_at) <= data),
    ),
  );
}

export function percentual(concluidas: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((concluidas / total) * 100);
}

export function resumoDoDia(tarefas: RotinaTarefa[], data: string, concluidasNoDia: Set<string> = new Set()): ResumoDia {
  const doDia = tarefasDoDia(tarefas, data, concluidasNoDia);
  const concluidas = doDia.filter((t) => concluidasNoDia.has(t.id)).length;
  return { data, total: doDia.length, concluidas, percentual: percentual(concluidas, doDia.length) };
}

export function resumosDoIntervalo(
  tarefas: RotinaTarefa[],
  conclusoes: RotinaConclusao[] | Map<string, Set<string>>,
  de: string,
  ate: string,
): ResumoDia[] {
  const idx = conclusoes instanceof Map ? conclusoes : indexarConclusoes(conclusoes);
  return intervaloDias(de, ate).map((d) => resumoDoDia(tarefas, d, idx.get(d)));
}

export const diaCompleto = (r: ResumoDia) => r.total > 0 && r.concluidas === r.total;

/**
 * Sequência atual de dias seguidos com 100%.
 * - Dias sem tarefas previstas são ignorados (não contam nem quebram).
 * - Hoje incompleto não quebra a sequência (o dia ainda está em andamento).
 */
export function calcularStreak(resumos: ResumoDia[], hoje: string): number {
  const ordenados = resumos.filter((r) => r.data <= hoje).sort((a, b) => (a.data < b.data ? 1 : -1));
  let streak = 0;
  for (const r of ordenados) {
    if (r.total === 0) continue;
    if (diaCompleto(r)) {
      streak++;
      continue;
    }
    if (r.data === hoje) continue;
    break;
  }
  return streak;
}

/** Maior sequência de dias 100% no período (dias sem tarefas são ignorados). */
export function maiorSequencia(resumos: ResumoDia[]): number {
  const ordenados = [...resumos].sort((a, b) => (a.data < b.data ? -1 : 1));
  let melhor = 0;
  let atual = 0;
  for (const r of ordenados) {
    if (r.total === 0) continue;
    if (diaCompleto(r)) {
      atual++;
      melhor = Math.max(melhor, atual);
    } else {
      atual = 0;
    }
  }
  return melhor;
}

export interface EstatisticasPeriodo {
  /** Média dos percentuais dos dias com tarefas (null se nenhum) */
  media: number | null;
  melhorDia: ResumoDia | null;
  diasCompletos: number;
  diasComTarefas: number;
}

export function estatisticasDoPeriodo(resumos: ResumoDia[]): EstatisticasPeriodo {
  const validos = resumos.filter((r) => r.total > 0);
  if (validos.length === 0) return { media: null, melhorDia: null, diasCompletos: 0, diasComTarefas: 0 };
  const soma = validos.reduce((acc, r) => acc + r.concluidas / r.total, 0);
  let melhorDia = validos[0];
  for (const r of validos) {
    const p = r.concluidas / r.total;
    const pm = melhorDia.concluidas / melhorDia.total;
    if (p > pm || (p === pm && r.data > melhorDia.data)) melhorDia = r;
  }
  return {
    media: Math.round((soma / validos.length) * 100),
    melhorDia,
    diasCompletos: validos.filter(diaCompleto).length,
    diasComTarefas: validos.length,
  };
}

export interface ResumoCategoria {
  categoria: RotinaCategoria | null;
  total: number;
  concluidas: number;
  percentual: number | null;
}

export function resumoPorCategoria(
  tarefas: RotinaTarefa[],
  categorias: RotinaCategoria[],
  conclusoes: RotinaConclusao[] | Map<string, Set<string>>,
  de: string,
  ate: string,
): ResumoCategoria[] {
  const idx = conclusoes instanceof Map ? conclusoes : indexarConclusoes(conclusoes);
  const porId = new Map(categorias.map((c) => [c.id, c]));
  const acc = new Map<string, { total: number; concluidas: number }>();
  for (const d of intervaloDias(de, ate)) {
    const feitas = idx.get(d) ?? new Set<string>();
    for (const t of tarefasDoDia(tarefas, d, feitas)) {
      const chave = t.categoria_id && porId.has(t.categoria_id) ? t.categoria_id : '';
      const item = acc.get(chave) ?? { total: 0, concluidas: 0 };
      item.total++;
      if (feitas.has(t.id)) item.concluidas++;
      acc.set(chave, item);
    }
  }
  const ordem = (c: RotinaCategoria | null) => (c ? c.ordem : Number.MAX_SAFE_INTEGER);
  return [...acc.entries()]
    .map(([id, v]) => {
      const categoria = id ? porId.get(id) ?? null : null;
      return { categoria, ...v, percentual: percentual(v.concluidas, v.total) };
    })
    .sort((a, b) => ordem(a.categoria) - ordem(b.categoria));
}

/** Tarefa "agora": a última cujo horário já começou. */
export function tarefaAtual(doDia: RotinaTarefa[], agoraHHMM: string): RotinaTarefa | null {
  const agora = horaParaMinutos(agoraHHMM);
  let atual: RotinaTarefa | null = null;
  for (const t of doDia) {
    if (horaParaMinutos(t.hora) <= agora) atual = t;
    else break;
  }
  return atual;
}

/** Próxima tarefa pendente que ainda vai começar. */
export function proximaPendente(
  doDia: RotinaTarefa[],
  concluidas: Set<string>,
  agoraHHMM: string,
): RotinaTarefa | null {
  const agora = horaParaMinutos(agoraHHMM);
  return doDia.find((t) => !concluidas.has(t.id) && horaParaMinutos(t.hora) > agora) ?? null;
}

// ─────────────────────────── CSV ───────────────────────────

function celula(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const linha = (vals: (string | number | null | undefined)[]) => vals.map(celula).join(';');

/** Relatório CSV (separador ";", padrão do Excel em pt-BR). */
export function gerarCsv(
  tarefas: RotinaTarefa[],
  categorias: RotinaCategoria[],
  conclusoes: RotinaConclusao[],
  de: string,
  ate: string,
): string {
  const porCat = new Map(categorias.map((c) => [c.id, c.nome]));
  const porChave = new Map(conclusoes.map((c) => [`${c.data}|${c.tarefa_id}`, c]));
  const idx = indexarConclusoes(conclusoes);
  const linhas: string[] = [];
  linhas.push(linha(['Data', 'Dia da semana', 'Hora', 'Tarefa', 'Categoria', 'Duração (min)', 'Concluída', 'Concluída em']));
  const resumos: ResumoDia[] = [];
  for (const d of intervaloDias(de, ate)) {
    const feitas = idx.get(d) ?? new Set<string>();
    const doDia = tarefasDoDia(tarefas, d, feitas);
    resumos.push(resumoDoDia(tarefas, d, feitas));
    for (const t of doDia) {
      const c = porChave.get(`${d}|${t.id}`);
      linhas.push(
        linha([
          formatarDataBR(d),
          DIAS_SEMANA_NOME[diaDaSemana(d)],
          t.hora,
          t.nome,
          t.categoria_id ? porCat.get(t.categoria_id) ?? '' : '',
          t.duracao_min ?? '',
          c ? 'Sim' : 'Não',
          c ? formatarDataHoraBR(c.concluida_em) : '',
        ]),
      );
    }
  }
  linhas.push('');
  linhas.push(linha(['Resumo por dia']));
  linhas.push(linha(['Data', 'Concluídas', 'Total', '% concluído']));
  for (const r of resumos) {
    linhas.push(linha([formatarDataBR(r.data), r.concluidas, r.total, r.percentual == null ? '' : `${r.percentual}%`]));
  }
  const est = estatisticasDoPeriodo(resumos);
  linhas.push('');
  linhas.push(linha(['Média do período', est.media == null ? '' : `${est.media}%`]));
  linhas.push(linha(['Dias 100% concluídos', est.diasCompletos]));
  return linhas.join('\r\n');
}
