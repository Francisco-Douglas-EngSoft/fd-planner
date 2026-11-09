import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RotinaConclusao, RotinaTarefa } from '../tipos';

// Banco em memória no lugar da camada de dados.
const banco = vi.hoisted(() => ({
  tarefas: [] as RotinaTarefa[],
  conclusoes: [] as RotinaConclusao[],
}));

vi.mock('../api', () => ({
  inicializarRotina: vi.fn(async () => false),
  listarCategorias: vi.fn(async () => [{ id: 'cat', nome: 'Corpo', cor: '#17A673', ordem: 0 }]),
  listarTarefas: vi.fn(async () => banco.tarefas),
  listarConclusoes: vi.fn(async () => [...banco.conclusoes]),
  marcarTarefa: vi.fn(async (_u: string, tarefaId: string, data: string, concluida: boolean) => {
    banco.conclusoes = banco.conclusoes.filter((c) => !(c.tarefa_id === tarefaId && c.data === data));
    if (concluida) banco.conclusoes.push({ id: `${tarefaId}-${data}`, tarefa_id: tarefaId, data, concluida_em: new Date().toISOString() });
  }),
  concluirTudo: vi.fn(),
  limparDia: vi.fn(),
}));

import * as api from '../api';
import { useRotina } from '../hooks';
import { TelaHoje } from '../components/TelaHoje';

function Tela() {
  const rotina = useRotina('usuario-1');
  if (rotina.carregando) return <p>carregando</p>;
  return <TelaHoje rotina={rotina} data={rotina.hoje} onDataChange={() => {}} onIrParaTarefas={() => {}} />;
}

const tarefa = (id: string, nome: string, hora: string): RotinaTarefa => ({
  id,
  categoria_id: 'cat',
  nome,
  hora,
  duracao_min: 30,
  dias_semana: [0, 1, 2, 3, 4, 5, 6],
  ativa: true,
  ordem: 0,
  created_at: '2020-01-01T00:00:00',
});

describe('Rotina: marcar e desmarcar uma tarefa', () => {
  beforeEach(() => {
    localStorage.setItem('rotina:init:usuario-1', '1');
    banco.tarefas = [tarefa('t1', 'Caminhada', '17:30'), tarefa('t2', 'Faculdade', '18:30')];
    banco.conclusoes = [];
    vi.clearAllMocks();
  });

  it('atualiza a % na hora e grava a marcação', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <Tela />
      </QueryClientProvider>,
    );

    const progresso = await screen.findByRole('progressbar', { name: /progresso/i });
    expect(progresso).toHaveAttribute('aria-valuenow', '0');

    const caminhada = screen.getByRole('checkbox', { name: /caminhada/i });
    expect(caminhada).toHaveAttribute('aria-checked', 'false');

    // Marcar
    fireEvent.click(caminhada);
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /caminhada/i })).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByRole('progressbar', { name: /progresso/i })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('1 de 2 tarefas')).toBeInTheDocument();
    await waitFor(() => expect(api.marcarTarefa).toHaveBeenCalledWith('usuario-1', 't1', expect.any(String), true));
    await waitFor(() => expect(banco.conclusoes).toHaveLength(1));

    // Desmarcar
    fireEvent.click(screen.getByRole('checkbox', { name: /caminhada/i }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /caminhada/i })).toHaveAttribute('aria-checked', 'false'));
    expect(screen.getByRole('progressbar', { name: /progresso/i })).toHaveAttribute('aria-valuenow', '0');
    await waitFor(() => expect(api.marcarTarefa).toHaveBeenLastCalledWith('usuario-1', 't1', expect.any(String), false));
    await waitFor(() => expect(banco.conclusoes).toHaveLength(0));
  });
});
