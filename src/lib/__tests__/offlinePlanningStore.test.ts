import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const upsert = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ upsert }) },
}));

import {
  saveGlobalGoal,
  flushGlobalGoalQueue,
  getCachedGlobalGoal,
  getPendingGlobalGoal,
  hasPendingGlobalGoal,
  cacheActivePlans,
  getCachedActivePlans,
  clearOfflinePlanningCache,
} from '../offlinePlanningStore';

const goal = { hoursPerDay: 5, days: [1, 2, 3], startDate: '2026-08-15' };

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

describe('offlinePlanningStore', () => {
  beforeEach(() => {
    localStorage.clear();
    upsert.mockReset();
    upsert.mockResolvedValue({ error: null });
    setOnline(true);
  });

  afterEach(() => setOnline(true));

  it('salva no servidor quando online e guarda cache local', async () => {
    const result = await saveGlobalGoal('u1', goal);
    expect(result).toBe('synced');
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(getCachedGlobalGoal('u1')).toEqual(goal);
    expect(hasPendingGlobalGoal('u1')).toBe(false);
  });

  it('enfileira a alteração quando está offline', async () => {
    setOnline(false);
    const result = await saveGlobalGoal('u1', goal);
    expect(result).toBe('queued');
    expect(upsert).not.toHaveBeenCalled();
    expect(getPendingGlobalGoal('u1')).toEqual(goal);
    expect(getCachedGlobalGoal('u1')).toEqual(goal);
  });

  it('sincroniza a alteração pendente ao voltar a conexão', async () => {
    setOnline(false);
    await saveGlobalGoal('u1', goal);

    setOnline(true);
    const flushed = await flushGlobalGoalQueue('u1');
    expect(flushed).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(hasPendingGlobalGoal('u1')).toBe(false);
  });

  it('mantém a pendência quando o servidor falha', async () => {
    upsert.mockResolvedValue({ error: { message: 'network' } });
    const result = await saveGlobalGoal('u1', goal);
    expect(result).toBe('queued');
    expect(hasPendingGlobalGoal('u1')).toBe(true);

    expect(await flushGlobalGoalQueue('u1')).toBe(false);
    expect(hasPendingGlobalGoal('u1')).toBe(true);

    upsert.mockResolvedValue({ error: null });
    expect(await flushGlobalGoalQueue('u1')).toBe(true);
    expect(hasPendingGlobalGoal('u1')).toBe(false);
  });

  it('guarda apenas a última versão pendente (last-write-wins)', async () => {
    setOnline(false);
    await saveGlobalGoal('u1', goal);
    await saveGlobalGoal('u1', { ...goal, hoursPerDay: 8 });
    expect(getPendingGlobalGoal('u1')?.hoursPerDay).toBe(8);
  });

  it('não devolve dados de outro usuário', async () => {
    await saveGlobalGoal('u1', goal);
    expect(getCachedGlobalGoal('u2')).toBeNull();
  });

  it('faz cache dos planejamentos ativos', () => {
    cacheActivePlans('u1', [{ id: 'p1' }]);
    expect(getCachedActivePlans<{ id: string }>('u1')?.plans).toEqual([{ id: 'p1' }]);
    expect(getCachedActivePlans('u2')).toBeNull();

    clearOfflinePlanningCache();
    expect(getCachedActivePlans('u1')).toBeNull();
  });
});
