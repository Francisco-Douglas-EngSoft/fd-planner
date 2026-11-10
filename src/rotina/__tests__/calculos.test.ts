import { describe, it, expect } from 'vitest';
import {
  calcularStreak,
  estatisticasDoPeriodo,
  gerarCsv,
  maiorSequencia,
  percentual,
  proximaPendente,
  resumoDoDia,
  resumoPorCategoria,
  resumosDoIntervalo,
  tarefaAtual,
  tarefasDoDia,
} from '../calculos';
import type { ResumoDia, RotinaCategoria, RotinaConclusao, RotinaTarefa } from '../tipos';

const tarefa = (id: string, hora: string, extra: Partial<RotinaTarefa> = {}): RotinaTarefa => ({
  id,
  categoria_id: null,
  nome: `Tarefa ${id}`,
  hora,
  duracao_min: null,
  dias_semana: [0, 1, 2, 3, 4, 5, 6],
  ativa: true,
  ordem: 0,
  created_at: '2026-01-01T12:00:00',
  lembrete_ativo: false,
  lembrete_min_antes: 0,
  ...extra,
});

const feito = (tarefa_id: string, data: string): RotinaConclusao => ({
  id: `${tarefa_id}-${data}`,
  tarefa_id,
  data,
  concluida_em: `${data}T10:00:00`,
});

const dia = (data: string, concluidas: number, total: number): ResumoDia => ({
  data,
  concluidas,
  total,
  percentual: percentual(concluidas, total),
});

describe('percentual', () => {
  it('arredonda para o inteiro mais próximo', () => {
    expect(percentual(1, 3)).toBe(33);
    expect(percentual(2, 3)).toBe(67);
    expect(percentual(15, 15)).toBe(100);
  });
  it('retorna null quando não há tarefas', () => {
    expect(percentual(0, 0)).toBeNull();
  });
});

describe('tarefasDoDia / resumoDoDia', () => {
  it('ordena pelo horário', () => {
    const t = [tarefa('b', '17:30'), tarefa('a', '04:00'), tarefa('c', '09:15')];
    expect(tarefasDoDia(t, '2026-11-09').map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });

  it('respeita os dias da semana (09/11/2026 é segunda-feira)', () => {
    const t = [tarefa('seg', '08:00', { dias_semana: [1] }), tarefa('fds', '08:00', { dias_semana: [0, 6] })];
    expect(tarefasDoDia(t, '2026-11-09').map((x) => x.id)).toEqual(['seg']);
  });

  it('ignora tarefas arquivadas e as criadas depois do dia', () => {
    const t = [tarefa('arq', '08:00', { ativa: false }), tarefa('nova', '09:00', { created_at: '2026-11-10T08:00:00' })];
    expect(tarefasDoDia(t, '2026-11-09')).toHaveLength(0);
  });

  it('mantém no histórico uma tarefa arquivada que foi marcada naquele dia', () => {
    const t = [tarefa('arq', '08:00', { ativa: false })];
    expect(resumoDoDia(t, '2026-11-09', new Set(['arq']))).toMatchObject({ total: 1, concluidas: 1, percentual: 100 });
  });

  it('calcula 2 de 3 tarefas como 67%', () => {
    const t = [tarefa('a', '04:00'), tarefa('b', '05:00'), tarefa('c', '06:00')];
    expect(resumoDoDia(t, '2026-11-09', new Set(['a', 'c']))).toEqual({ data: '2026-11-09', total: 3, concluidas: 2, percentual: 67 });
  });
});

describe('calcularStreak', () => {
  it('conta dias seguidos com 100% até hoje', () => {
    const r = [dia('2026-11-06', 1, 2), dia('2026-11-07', 2, 2), dia('2026-11-08', 3, 3), dia('2026-11-09', 2, 2)];
    expect(calcularStreak(r, '2026-11-09')).toBe(3);
  });

  it('hoje incompleto não quebra a sequência', () => {
    const r = [dia('2026-11-07', 2, 2), dia('2026-11-08', 2, 2), dia('2026-11-09', 0, 2)];
    expect(calcularStreak(r, '2026-11-09')).toBe(2);
  });

  it('um dia incompleto antes de hoje zera a sequência', () => {
    const r = [dia('2026-11-07', 2, 2), dia('2026-11-08', 1, 2), dia('2026-11-09', 0, 2)];
    expect(calcularStreak(r, '2026-11-09')).toBe(0);
  });

  it('dias sem tarefas previstas são ignorados', () => {
    const r = [dia('2026-11-06', 2, 2), dia('2026-11-07', 0, 0), dia('2026-11-08', 2, 2), dia('2026-11-09', 2, 2)];
    expect(calcularStreak(r, '2026-11-09')).toBe(3);
  });

  it('é zero sem histórico', () => {
    expect(calcularStreak([], '2026-11-09')).toBe(0);
  });

  it('maiorSequencia encontra o recorde do período', () => {
    const r = [dia('2026-11-01', 1, 1), dia('2026-11-02', 1, 1), dia('2026-11-03', 1, 1), dia('2026-11-04', 0, 1), dia('2026-11-05', 1, 1)];
    expect(maiorSequencia(r)).toBe(3);
  });
});

describe('estatisticasDoPeriodo', () => {
  it('calcula média, melhor dia e dias 100% ignorando dias sem tarefas', () => {
    const r = [dia('2026-11-06', 1, 2), dia('2026-11-07', 0, 0), dia('2026-11-08', 2, 2), dia('2026-11-09', 1, 4)];
    const e = estatisticasDoPeriodo(r);
    // (50% + 100% + 25%) / 3 = 58,33%
    expect(e.media).toBe(58);
    expect(e.melhorDia?.data).toBe('2026-11-08');
    expect(e.diasCompletos).toBe(1);
    expect(e.diasComTarefas).toBe(3);
  });

  it('retorna média nula quando não há dias com tarefas', () => {
    expect(estatisticasDoPeriodo([dia('2026-11-09', 0, 0)]).media).toBeNull();
  });

  it('os números do intervalo batem com as marcações', () => {
    const t = [tarefa('a', '04:00'), tarefa('b', '05:00')];
    const c = [feito('a', '2026-11-08'), feito('b', '2026-11-08'), feito('a', '2026-11-09')];
    const r = resumosDoIntervalo(t, c, '2026-11-08', '2026-11-09');
    expect(r.map((x) => x.percentual)).toEqual([100, 50]);
    expect(estatisticasDoPeriodo(r).media).toBe(75);
  });
});

describe('resumoPorCategoria', () => {
  it('soma concluídas e previstas por categoria', () => {
    const cats: RotinaCategoria[] = [
      { id: 'estudo', nome: 'Estudo', cor: '#2D7FF9', ordem: 1 },
      { id: 'corpo', nome: 'Corpo', cor: '#17A673', ordem: 3 },
    ];
    const t = [tarefa('a', '04:00', { categoria_id: 'estudo' }), tarefa('b', '17:30', { categoria_id: 'corpo' })];
    const c = [feito('a', '2026-11-08'), feito('a', '2026-11-09'), feito('b', '2026-11-09')];
    const r = resumoPorCategoria(t, cats, c, '2026-11-08', '2026-11-09');
    expect(r.map((x) => [x.categoria?.nome, x.concluidas, x.total, x.percentual])).toEqual([
      ['Estudo', 2, 2, 100],
      ['Corpo', 1, 2, 50],
    ]);
  });
});

describe('tarefa atual e próxima pendente', () => {
  const t = [tarefa('a', '04:00'), tarefa('b', '07:00'), tarefa('c', '17:30')];
  it('a tarefa atual é a última que já começou', () => {
    expect(tarefaAtual(t, '08:15')?.id).toBe('b');
    expect(tarefaAtual(t, '03:59')).toBeNull();
  });
  it('a próxima pendente é a primeira não feita que ainda vai começar', () => {
    expect(proximaPendente(t, new Set(), '08:15')?.id).toBe('c');
    expect(proximaPendente(t, new Set(['c']), '08:15')).toBeNull();
  });
});

describe('gerarCsv', () => {
  it('gera uma linha por tarefa prevista com datas no formato brasileiro', () => {
    const t = [tarefa('a', '04:00', { nome: 'Oração; manhã' })];
    const csv = gerarCsv(t, [], [feito('a', '2026-11-09')], '2026-11-09', '2026-11-09');
    const linhas = csv.split('\r\n');
    expect(linhas[0]).toBe('Data;Dia da semana;Hora;Tarefa;Categoria;Duração (min);Concluída;Concluída em');
    expect(linhas[1]).toBe('09/11/2026;segunda-feira;04:00;"Oração; manhã";;;Sim;09/11/2026 10:00');
    expect(csv).toContain('Média do período;100%');
  });
});
