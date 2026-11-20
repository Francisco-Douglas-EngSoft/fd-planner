import { describe, it, expect } from "vitest";
import { checkCycleCompletion, LATE_NOTIFY_MS } from "@/lib/focusCycleCompletion";

const END = 1_700_000_000_000;

describe("checkCycleCompletion", () => {
  it("avisa quando o ciclo termina agora", () => {
    expect(checkCycleCompletion({ targetEndTime: END, now: END, storedTargetEndTime: END, claimedTarget: null })).toBe("complete");
  });

  it("sem horário de término não é fim de ciclo (ex.: Iniciar em 00:00)", () => {
    expect(checkCycleCompletion({ targetEndTime: null, now: END, storedTargetEndTime: null, claimedTarget: null })).toBe("no_cycle");
  });

  it("ainda faltando tempo não avisa", () => {
    expect(checkCycleCompletion({ targetEndTime: END, now: END - 5_000, storedTargetEndTime: END, claimedTarget: null })).toBe("not_finished");
  });

  it("outra aba pausou ou mudou o ciclo: não avisa", () => {
    expect(checkCycleCompletion({ targetEndTime: END, now: END, storedTargetEndTime: null, claimedTarget: null })).toBe("stale");
    expect(checkCycleCompletion({ targetEndTime: END, now: END, storedTargetEndTime: END + 60_000, claimedTarget: null })).toBe("stale");
  });

  it("ciclo já concluído por outra aba: não avisa de novo", () => {
    expect(checkCycleCompletion({ targetEndTime: END, now: END, storedTargetEndTime: END, claimedTarget: END })).toBe("stale");
  });

  it("voltando da suspensão mais de 1 minuto depois do fim: registra sem avisar", () => {
    expect(checkCycleCompletion({ targetEndTime: END, now: END + LATE_NOTIFY_MS + 1, storedTargetEndTime: END, claimedTarget: null })).toBe("complete_silent");
    expect(checkCycleCompletion({ targetEndTime: END, now: END + LATE_NOTIFY_MS, storedTargetEndTime: END, claimedTarget: null })).toBe("complete");
  });
});

import { claimFocusCelebration } from "@/lib/focusCycleCompletion";

describe("claimFocusCelebration", () => {
  const memory = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  it("comemora 'todos os ciclos completos' só uma vez por curso por dia", () => {
    const s = memory();
    const day = new Date(2026, 10, 19, 10);
    expect(claimFocusCelebration(s, "cycles", "c1", day)).toBe(true);
    expect(claimFocusCelebration(s, "cycles", "c1", new Date(2026, 10, 19, 22))).toBe(false); // reabriu a página
    expect(claimFocusCelebration(s, "cycles", "c2", day)).toBe(true); // outro curso
    expect(claimFocusCelebration(s, "cycles", "c1", new Date(2026, 10, 20, 9))).toBe(true); // dia seguinte
  });

  it("meta diária e ciclos são avisos separados; sem curso não comemora", () => {
    const s = memory();
    const day = new Date(2026, 10, 19);
    expect(claimFocusCelebration(s, "cycles", "c1", day)).toBe(true);
    expect(claimFocusCelebration(s, "daily_goal", "c1", day)).toBe(true);
    expect(claimFocusCelebration(s, "daily_goal", "", day)).toBe(false);
  });
});
