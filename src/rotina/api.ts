/**
 * Camada de dados da Rotina Diária (equivale à "API" do módulo).
 * Toda leitura/escrita passa pelo cliente do sistema; as regras de acesso do
 * banco garantem que cada usuário só enxerga os próprios registros.
 */
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPaginated } from '@/lib/supabasePagination';
import { normalizarHora } from './datas';
import type {
  AtualizacaoTarefa,
  NovaTarefaInput,
  RotinaCategoria,
  RotinaConclusao,
  RotinaTarefa,
} from './tipos';

// ───────────── Validação ─────────────

const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido (HH:MM).');

export const tarefaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da tarefa.').max(200, 'O nome pode ter até 200 caracteres.'),
  hora: horaSchema,
  duracao_min: z
    .number({ invalid_type_error: 'Duração inválida.' })
    .int('Use minutos inteiros.')
    .min(1, 'A duração deve ser de pelo menos 1 minuto.')
    .max(1440, 'A duração pode ser de no máximo 24 horas.')
    .nullable(),
  categoria_id: z.string().uuid().nullable(),
  dias_semana: z
    .array(z.number().int().min(0).max(6))
    .min(1, 'Escolha pelo menos um dia da semana.')
    .transform((d) => [...new Set(d)].sort()),
  ativa: z.boolean().optional(),
});

export const categoriaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da categoria.').max(60, 'O nome pode ter até 60 caracteres.'),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida.'),
});

const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');

function validar<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, valor: unknown): T {
  const r = schema.safeParse(valor);
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? 'Dados inválidos.');
  return r.data;
}

function falha(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

// ───────────── Mapeamento ─────────────

type TarefaRow = {
  id: string;
  categoria_id: string | null;
  nome: string;
  hora: string;
  duracao_min: number | null;
  dias_semana: number[];
  ativa: boolean;
  ordem: number;
  created_at: string;
};

const mapTarefa = (r: TarefaRow): RotinaTarefa => ({ ...r, hora: normalizarHora(r.hora), dias_semana: r.dias_semana ?? [] });

const CAMPOS_TAREFA = 'id, categoria_id, nome, hora, duracao_min, dias_semana, ativa, ordem, created_at';

// ───────────── Inicialização (rotina padrão no primeiro acesso) ─────────────

export async function inicializarRotina(): Promise<boolean> {
  const { data, error } = await supabase.rpc('rotina_inicializar');
  falha(error);
  return Boolean(data);
}

// ───────────── Categorias ─────────────

export async function listarCategorias(): Promise<RotinaCategoria[]> {
  const { data, error } = await supabase
    .from('rotina_categorias')
    .select('id, nome, cor, ordem')
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true });
  falha(error);
  return data ?? [];
}

export async function criarCategoria(userId: string, input: { nome: string; cor: string; ordem: number }): Promise<RotinaCategoria> {
  const v = validar(categoriaSchema, input);
  const { data, error } = await supabase
    .from('rotina_categorias')
    .insert({ user_id: userId, nome: v.nome, cor: v.cor, ordem: input.ordem })
    .select('id, nome, cor, ordem')
    .single();
  falha(error);
  return data as RotinaCategoria;
}

export async function atualizarCategoria(id: string, patch: Partial<{ nome: string; cor: string }>): Promise<void> {
  const v = validar(categoriaSchema.partial(), patch);
  const { error } = await supabase.from('rotina_categorias').update(v).eq('id', id);
  falha(error);
}

export async function removerCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('rotina_categorias').delete().eq('id', id);
  falha(error);
}

// ───────────── Tarefas ─────────────

export async function listarTarefas(): Promise<RotinaTarefa[]> {
  const { data, error } = await supabase
    .from('rotina_tarefas')
    .select(CAMPOS_TAREFA)
    .order('hora', { ascending: true })
    .order('ordem', { ascending: true });
  falha(error);
  return ((data ?? []) as TarefaRow[]).map(mapTarefa);
}

export async function criarTarefa(userId: string, input: NovaTarefaInput, ordem: number): Promise<RotinaTarefa> {
  const v = validar(tarefaSchema, input) as NovaTarefaInput;
  const { data, error } = await supabase
    .from('rotina_tarefas')
    .insert({ user_id: userId, ...v, ativa: v.ativa ?? true, ordem })
    .select(CAMPOS_TAREFA)
    .single();
  falha(error);
  return mapTarefa(data as TarefaRow);
}

export async function atualizarTarefa(id: string, patch: AtualizacaoTarefa): Promise<void> {
  const v = validar(tarefaSchema.partial(), patch);
  const { error } = await supabase.from('rotina_tarefas').update(v).eq('id', id);
  falha(error);
}

export async function removerTarefa(id: string): Promise<void> {
  const { error } = await supabase.from('rotina_tarefas').delete().eq('id', id);
  falha(error);
}

// ───────────── Conclusões (marcações por dia) ─────────────

export async function listarConclusoes(de: string, ate: string): Promise<RotinaConclusao[]> {
  validar(dataSchema, de);
  validar(dataSchema, ate);
  return fetchAllPaginated<RotinaConclusao>(() =>
    supabase
      .from('rotina_conclusoes')
      .select('id, tarefa_id, data, concluida_em')
      .gte('data', de)
      .lte('data', ate)
      .order('data', { ascending: true })
      .order('id', { ascending: true }),
  );
}

/** Marca ou desmarca uma tarefa em um dia. */
export async function marcarTarefa(userId: string, tarefaId: string, data: string, concluida: boolean): Promise<void> {
  validar(dataSchema, data);
  if (concluida) {
    const { error } = await supabase
      .from('rotina_conclusoes')
      .upsert(
        { user_id: userId, tarefa_id: tarefaId, data, concluida_em: new Date().toISOString() },
        { onConflict: 'tarefa_id,data', ignoreDuplicates: true },
      );
    falha(error);
  } else {
    const { error } = await supabase.from('rotina_conclusoes').delete().eq('tarefa_id', tarefaId).eq('data', data);
    falha(error);
  }
}

/** Marca todas as tarefas informadas como concluídas no dia. */
export async function concluirTudo(userId: string, data: string, tarefaIds: string[]): Promise<void> {
  validar(dataSchema, data);
  if (tarefaIds.length === 0) return;
  const agora = new Date().toISOString();
  const { error } = await supabase
    .from('rotina_conclusoes')
    .upsert(
      tarefaIds.map((tarefa_id) => ({ user_id: userId, tarefa_id, data, concluida_em: agora })),
      { onConflict: 'tarefa_id,data', ignoreDuplicates: true },
    );
  falha(error);
}

/** Remove todas as marcações do usuário no dia. */
export async function limparDia(userId: string, data: string): Promise<void> {
  validar(dataSchema, data);
  const { error } = await supabase.from('rotina_conclusoes').delete().eq('user_id', userId).eq('data', data);
  falha(error);
}
