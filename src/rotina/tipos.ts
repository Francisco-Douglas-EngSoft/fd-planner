/**
 * Tipos do módulo Rotina Diária.
 * Datas de dia são sempre strings locais "AAAA-MM-DD"; horários "HH:MM".
 */

export interface RotinaCategoria {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
}

export interface RotinaTarefa {
  id: string;
  categoria_id: string | null;
  nome: string;
  /** "HH:MM" */
  hora: string;
  duracao_min: number | null;
  /** 0 = domingo … 6 = sábado */
  dias_semana: number[];
  ativa: boolean;
  ordem: number;
  created_at: string;
}

export interface RotinaConclusao {
  id: string;
  tarefa_id: string;
  /** "AAAA-MM-DD" */
  data: string;
  concluida_em: string;
}

export interface ResumoDia {
  data: string;
  total: number;
  concluidas: number;
  /** null quando não há tarefas previstas no dia */
  percentual: number | null;
}

export interface NovaTarefaInput {
  nome: string;
  hora: string;
  duracao_min: number | null;
  categoria_id: string | null;
  dias_semana: number[];
  ativa?: boolean;
}

export type AtualizacaoTarefa = Partial<NovaTarefaInput>;
