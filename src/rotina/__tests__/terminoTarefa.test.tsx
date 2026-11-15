import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RotinaTarefa } from '../tipos';

const banco = vi.hoisted(() => ({ tarefas: [] as RotinaTarefa[] }));

// O cliente do banco não existe em teste: só o que a tela chama é substituído.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } },
}));

vi.mock('../api', async (importOriginal) => {
  const real = await importOriginal<typeof import('../api')>();
  return {
    ...real,
    inicializarRotina: vi.fn(async () => false),
    listarCategorias: vi.fn(async () => [{ id: 'cat', nome: 'Corpo', cor: '#17A673', ordem: 0 }]),
    listarTarefas: vi.fn(async () => banco.tarefas),
    listarConclusoes: vi.fn(async () => []),
    criarTarefa: vi.fn(async () => banco.tarefas[0]),
    atualizarTarefa: vi.fn(async () => null),
    removerTarefa: vi.fn(async () => null),
    criarCategoria: vi.fn(async () => null),
    atualizarCategoria: vi.fn(async () => null),
    removerCategoria: vi.fn(async () => null),
    marcarTarefa: vi.fn(async () => null),
    concluirTudo: vi.fn(async () => null),
    limparDia: vi.fn(async () => null),
  };
});

import { useRotina } from '../hooks';
import { GerenciarTarefas } from '../components/GerenciarTarefas';

const tarefa = (id: string, hora: string, duracao_min: number | null): RotinaTarefa => ({
  id,
  categoria_id: 'cat',
  nome: `Tarefa ${id}`,
  hora,
  duracao_min,
  dias_semana: [0, 1, 2, 3, 4, 5, 6],
  ativa: true,
  ordem: 0,
  created_at: '2020-01-01T00:00:00',
  lembrete_ativo: false,
  lembrete_min_antes: 0,
});

function Tela() {
  const rotina = useRotina('usuario-1');
  if (rotina.carregando) return <p>carregando</p>;
  return <GerenciarTarefas rotina={rotina} />;
}

const abrir = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <Tela />
    </QueryClientProvider>,
  );
};

const abrirForm = async () => within(await screen.findByRole('form', { name: /nova tarefa/i }));

beforeEach(() => {
  localStorage.setItem('rotina:init:usuario-1', '1');
  banco.tarefas = [tarefa('t1', '04:00', 30)];
});

describe('término calculado ao informar a duração', () => {
  it('mostra o término da tarefa salva: 04:00 com 30 min termina 04:30', async () => {
    abrir();
    expect(await screen.findByText('→ 04:30')).toBeInTheDocument();
  });

  it('calcula na hora enquanto a nova tarefa é digitada: 04:00 + 5 min = 04:05', async () => {
    abrir();
    const f = await abrirForm();
    fireEvent.change(f.getByLabelText(/^horário$/i), { target: { value: '04:00' } });
    fireEvent.change(f.getByLabelText(/duração \(min\)/i), { target: { value: '5' } });
    expect(f.getByRole('status')).toHaveTextContent('Começa às 04:00 e termina às 04:05');
  });

  it('avisa quando o término passa da meia-noite: 23:50 + 20 min = 00:10 do dia seguinte', async () => {
    abrir();
    const f = await abrirForm();
    fireEvent.change(f.getByLabelText(/^horário$/i), { target: { value: '23:50' } });
    fireEvent.change(f.getByLabelText(/duração \(min\)/i), { target: { value: '20' } });
    expect(f.getByRole('status')).toHaveTextContent('termina às 00:10 do dia seguinte');
  });

  it('sem duração não inventa término', async () => {
    abrir();
    const f = await abrirForm();
    expect(f.getByRole('status')).toHaveTextContent('Informe a duração');
  });
});
