import { describe, it, expect } from 'vitest';
import { chaveLembrete, lembretesVencidos, momentoDoLembrete, proximoLembrete, temLembreteNoDia } from '../lembretes';
import type { RotinaTarefa } from '../tipos';

const tarefa = (extra: Partial<RotinaTarefa> = {}): RotinaTarefa => ({
  id: 't1',
  categoria_id: null,
  nome: 'Estudar',
  hora: '08:00',
  duracao_min: null,
  dias_semana: [1, 2, 3, 4, 5], // seg–sex
  ativa: true,
  ordem: 0,
  created_at: '2026-01-01T12:00:00',
  lembrete_ativo: true,
  lembrete_min_antes: 0,
  ...extra,
});

// 2026-03-02 = segunda, 2026-03-07 = sábado, 2026-03-08 = domingo
const em = (iso: string, hhmm: string) => new Date(`${iso}T${hhmm}:00`);

describe('lembretes da Rotina', () => {
  it('avisa no horário da tarefa num dia ativo', () => {
    const v = lembretesVencidos([tarefa()], em('2026-03-02', '08:00'), new Set());
    expect(v.map((o) => o.chave)).toEqual([chaveLembrete('t1', '2026-03-02')]);
  });

  it('não avisa antes do horário', () => {
    expect(lembretesVencidos([tarefa()], em('2026-03-02', '07:59'), new Set())).toHaveLength(0);
  });

  it('não avisa em dia da semana que não está marcado', () => {
    expect(temLembreteNoDia(tarefa(), '2026-03-07')).toBe(false);
    expect(lembretesVencidos([tarefa()], em('2026-03-07', '08:00'), new Set())).toHaveLength(0);
  });

  it('não avisa tarefa arquivada nem com lembrete desligado', () => {
    expect(lembretesVencidos([tarefa({ ativa: false })], em('2026-03-02', '08:00'), new Set())).toHaveLength(0);
    expect(lembretesVencidos([tarefa({ lembrete_ativo: false })], em('2026-03-02', '08:00'), new Set())).toHaveLength(0);
  });

  it('não repete um aviso já enviado', () => {
    const enviados = new Set([chaveLembrete('t1', '2026-03-02')]);
    expect(lembretesVencidos([tarefa()], em('2026-03-02', '08:01'), enviados)).toHaveLength(0);
  });

  it('respeita a antecedência escolhida', () => {
    const t = tarefa({ lembrete_min_antes: 15 });
    expect(momentoDoLembrete(t, '2026-03-02')).toEqual(em('2026-03-02', '07:45'));
    expect(lembretesVencidos([t], em('2026-03-02', '07:45'), new Set())).toHaveLength(1);
  });

  it('aviso antecipado pode cair no dia anterior (tarefa de segunda 00:10, 30 min antes)', () => {
    const t = tarefa({ hora: '00:10', lembrete_min_antes: 30 });
    const v = lembretesVencidos([t], em('2026-03-01', '23:40'), new Set());
    expect(v.map((o) => o.data)).toEqual(['2026-03-02']);
  });

  it('aviso atrasado só aparece até 10 minutos depois', () => {
    expect(lembretesVencidos([tarefa()], em('2026-03-02', '08:10'), new Set())).toHaveLength(1);
    expect(lembretesVencidos([tarefa()], em('2026-03-02', '08:11'), new Set())).toHaveLength(0);
  });

  it('próximo aviso pula o fim de semana', () => {
    // sexta 09:00 → próximo é só segunda; dentro de 24h não há nenhum
    expect(proximoLembrete([tarefa()], em('2026-03-06', '09:00'))).toBeNull();
    expect(proximoLembrete([tarefa()], em('2026-03-01', '09:00'))).toEqual(em('2026-03-02', '08:00'));
  });
});
