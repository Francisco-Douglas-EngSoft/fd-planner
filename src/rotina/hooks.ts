/**
 * Estado da Rotina Diária com React Query e atualização otimista
 * (a % muda na hora; em caso de erro a marcação volta e um aviso aparece).
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as api from './api';
import { paraISO, somarDias } from './datas';
import type { AtualizacaoTarefa, NovaTarefaInput, RotinaCategoria, RotinaConclusao, RotinaTarefa } from './tipos';

/** Dias de histórico carregados (sequência, painel e exportação). */
export const JANELA_HISTORICO = 365;

interface Base {
  categorias: RotinaCategoria[];
  tarefas: RotinaTarefa[];
}

function useAgora(intervaloMs = 30_000): Date {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setAgora(new Date()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);
  return agora;
}

const tmpId = () => `tmp-${Math.random().toString(36).slice(2)}`;

export function useRotina(userId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const agora = useAgora();
  const hoje = paraISO(agora);
  const desde = somarDias(hoje, -JANELA_HISTORICO);

  const baseKey: QueryKey = ['rotina', userId, 'base'];
  const concKey: QueryKey = ['rotina', userId, 'conclusoes', desde, hoje];
  /** Lista usada pelos lembretes (ver components/LembretesRotina). */
  const lembKey: QueryKey = ['rotina', userId, 'lembretes'];

  const base = useQuery({
    queryKey: baseKey,
    enabled: !!userId,
    queryFn: async (): Promise<Base> => {
      const flag = `rotina:init:${userId}`;
      if (!localStorage.getItem(flag)) {
        try {
          await api.inicializarRotina();
          localStorage.setItem(flag, '1');
        } catch {
          // Sem conexão: tenta de novo no próximo acesso.
        }
      }
      const [categorias, tarefas] = await Promise.all([api.listarCategorias(), api.listarTarefas()]);
      return { categorias, tarefas };
    },
  });

  const conclusoes = useQuery({
    queryKey: concKey,
    enabled: !!userId,
    queryFn: () => api.listarConclusoes(desde, hoje),
  });

  const erro = (title: string) => (e: unknown) =>
    toast({ title, description: e instanceof Error ? e.message : String(e), variant: 'destructive' });

  /** Mutação com atualização otimista em uma das consultas. */
  function useOtimista<V, D>(
    key: QueryKey,
    fn: (v: V) => Promise<unknown>,
    aplicar: (atual: D, v: V) => D,
    tituloErro: string,
    alsoInvalidate: QueryKey[] = [],
  ) {
    return useMutation({
      mutationFn: fn,
      onMutate: async (v: V) => {
        await qc.cancelQueries({ queryKey: key });
        const anterior = qc.getQueryData<D>(key);
        if (anterior !== undefined) qc.setQueryData<D>(key, aplicar(anterior, v));
        return { anterior };
      },
      onError: (e, _v, ctx) => {
        if (ctx?.anterior !== undefined) qc.setQueryData(key, ctx.anterior);
        erro(tituloErro)(e);
      },
      onSettled: () => {
        qc.invalidateQueries({ queryKey: key });
        alsoInvalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      },
    });
  }

  const uid = userId ?? '';

  // ── Marcações ──
  const marcar = useOtimista<{ tarefaId: string; data: string; concluida: boolean }, RotinaConclusao[]>(
    concKey,
    (v) => api.marcarTarefa(uid, v.tarefaId, v.data, v.concluida),
    (lista, v) => {
      const sem = lista.filter((c) => !(c.tarefa_id === v.tarefaId && c.data === v.data));
      return v.concluida
        ? [...sem, { id: tmpId(), tarefa_id: v.tarefaId, data: v.data, concluida_em: new Date().toISOString() }]
        : sem;
    },
    'Não foi possível salvar a marcação',
  );

  const marcarTudo = useOtimista<{ data: string; tarefaIds: string[] }, RotinaConclusao[]>(
    concKey,
    (v) => api.concluirTudo(uid, v.data, v.tarefaIds),
    (lista, v) => {
      const ja = new Set(lista.filter((c) => c.data === v.data).map((c) => c.tarefa_id));
      const agoraTs = new Date().toISOString();
      return [
        ...lista,
        ...v.tarefaIds.filter((id) => !ja.has(id)).map((id) => ({ id: tmpId(), tarefa_id: id, data: v.data, concluida_em: agoraTs })),
      ];
    },
    'Não foi possível marcar tudo',
  );

  const limpar = useOtimista<{ data: string }, RotinaConclusao[]>(
    concKey,
    (v) => api.limparDia(uid, v.data),
    (lista, v) => lista.filter((c) => c.data !== v.data),
    'Não foi possível limpar o dia',
  );

  // ── Tarefas ──
  const criarTarefa = useMutation({
    mutationFn: (input: NovaTarefaInput) => {
      const atual = qc.getQueryData<Base>(baseKey);
      const ordem = (atual?.tarefas.reduce((m, t) => Math.max(m, t.ordem), -1) ?? -1) + 1;
      return api.criarTarefa(uid, input, ordem);
    },
    onSuccess: (nova) => {
      qc.setQueryData<Base>(baseKey, (b) => (b ? { ...b, tarefas: [...b.tarefas, nova] } : b));
      toast({ title: 'Tarefa adicionada' });
    },
    onError: erro('Não foi possível adicionar a tarefa'),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: baseKey });
      qc.invalidateQueries({ queryKey: lembKey });
    },
  });

  const atualizarTarefa = useOtimista<{ id: string; patch: AtualizacaoTarefa }, Base>(
    baseKey,
    (v) => api.atualizarTarefa(v.id, v.patch),
    (b, v) => ({ ...b, tarefas: b.tarefas.map((t) => (t.id === v.id ? { ...t, ...v.patch } : t)) }),
    'Não foi possível salvar a tarefa',
    [lembKey],
  );

  const removerTarefa = useOtimista<{ id: string }, Base>(
    baseKey,
    (v) => api.removerTarefa(v.id),
    (b, v) => ({ ...b, tarefas: b.tarefas.filter((t) => t.id !== v.id) }),
    'Não foi possível remover a tarefa',
    [concKey, lembKey],
  );

  // ── Categorias ──
  const criarCategoria = useMutation({
    mutationFn: (input: { nome: string; cor: string }) => {
      const atual = qc.getQueryData<Base>(baseKey);
      const ordem = (atual?.categorias.reduce((m, c) => Math.max(m, c.ordem), -1) ?? -1) + 1;
      return api.criarCategoria(uid, { ...input, ordem });
    },
    onSuccess: (nova) => qc.setQueryData<Base>(baseKey, (b) => (b ? { ...b, categorias: [...b.categorias, nova] } : b)),
    onError: erro('Não foi possível criar a categoria'),
    onSettled: () => qc.invalidateQueries({ queryKey: baseKey }),
  });

  const atualizarCategoria = useOtimista<{ id: string; patch: Partial<{ nome: string; cor: string }> }, Base>(
    baseKey,
    (v) => api.atualizarCategoria(v.id, v.patch),
    (b, v) => ({ ...b, categorias: b.categorias.map((c) => (c.id === v.id ? { ...c, ...v.patch } : c)) }),
    'Não foi possível salvar a categoria',
  );

  const removerCategoria = useOtimista<{ id: string }, Base>(
    baseKey,
    (v) => api.removerCategoria(v.id),
    (b, v) => ({
      categorias: b.categorias.filter((c) => c.id !== v.id),
      tarefas: b.tarefas.map((t) => (t.categoria_id === v.id ? { ...t, categoria_id: null } : t)),
    }),
    'Não foi possível remover a categoria',
  );

  const acoes = useMemo(
    () => ({
      marcar: (tarefaId: string, data: string, concluida: boolean) => marcar.mutate({ tarefaId, data, concluida }),
      marcarTudo: (data: string, tarefaIds: string[]) => marcarTudo.mutate({ data, tarefaIds }),
      limparDia: (data: string) => limpar.mutate({ data }),
      criarTarefa: (input: NovaTarefaInput) => criarTarefa.mutateAsync(input),
      atualizarTarefa: (id: string, patch: AtualizacaoTarefa) => atualizarTarefa.mutate({ id, patch }),
      removerTarefa: (id: string) => removerTarefa.mutate({ id }),
      criarCategoria: (input: { nome: string; cor: string }) => criarCategoria.mutate(input),
      atualizarCategoria: (id: string, patch: Partial<{ nome: string; cor: string }>) => atualizarCategoria.mutate({ id, patch }),
      removerCategoria: (id: string) => removerCategoria.mutate({ id }),
    }),
    // As funções mutate são estáveis entre renderizações.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    agora,
    hoje,
    desde,
    carregando: base.isLoading || conclusoes.isLoading,
    erro: base.error ?? conclusoes.error,
    recarregar: () => {
      base.refetch();
      conclusoes.refetch();
    },
    categorias: base.data?.categorias ?? [],
    tarefas: base.data?.tarefas ?? [],
    conclusoes: conclusoes.data ?? [],
    criandoTarefa: criarTarefa.isPending,
    acoes,
  };
}

export type RotinaEstado = ReturnType<typeof useRotina>;
