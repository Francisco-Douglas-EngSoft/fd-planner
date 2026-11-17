import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Mock Supabase — the timer talks to auth.getUser() when a session finishes.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
  },
}));
vi.mock("@/hooks/useRealtimeFocusSessions", () => ({
  emitFocusSessionSaved: vi.fn(),
}));
vi.mock("@/lib/offlineFocusQueue", () => ({
  enqueueFocusSession: vi.fn(),
  flushFocusQueue: vi.fn().mockResolvedValue(undefined),
}));

import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { enqueueFocusSession } from "@/lib/offlineFocusQueue";

describe("usePomodoroTimer", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.mocked(enqueueFocusSession).mockClear();
  });

  it("inicia com valores padrão de work e sem timer rodando", () => {
    const { result } = renderHook(() => usePomodoroTimer());
    expect(result.current.mode).toBe("work");
    expect(result.current.isRunning).toBe(false);
    expect(result.current.timeLeft).toBeGreaterThan(0);
  });

  it("setCustomTime atualiza o tempo e reseta o modo corretamente", () => {
    const { result } = renderHook(() => usePomodoroTimer());
    act(() => result.current.setCustomTime(600, "work"));
    expect(result.current.timeLeft).toBe(600);
    expect(result.current.customTotalTime).toBe(600);
  });

  it("toggleTimer inicia e pausa a contagem", () => {
    const { result } = renderHook(() => usePomodoroTimer());
    act(() => {
      result.current.setSelectedCourse("course-1");
      result.current.setCustomTime(120, "work");
    });
    act(() => result.current.toggleTimer());
    expect(result.current.isRunning).toBe(true);
    act(() => result.current.toggleTimer());
    expect(result.current.isRunning).toBe(false);
  });

  it("resetTimer volta o timer para o estado inicial de trabalho", () => {
    const { result } = renderHook(() => usePomodoroTimer());
    act(() => result.current.setCustomTime(300, "work"));
    act(() => result.current.resetTimer());
    expect(result.current.isRunning).toBe(false);
    expect(result.current.mode).toBe("work");
  });

  it("persiste presets no localStorage", () => {
    const { result } = renderHook(() => usePomodoroTimer());
    act(() =>
      result.current.addCustomPreset({ name: "Estudo Intenso", work: 50, break: 10, longBreak: 20 }),
    );
    const saved = JSON.parse(localStorage.getItem("fdplanner_pomodoro_presets") ?? "[]");
    expect(saved.some((p: { name: string }) => p.name === "Estudo Intenso")).toBe(true);
  });

  it("escolher um preset define a duração do foco pelo preset", () => {
    const { result } = renderHook(() => usePomodoroTimer());
    const deepWork = result.current.builtInPresets.find((p) => p.name === "Deep Work")!;
    act(() => result.current.changePreset(deepWork));
    expect(result.current.timeLeft).toBe(50 * 60);
    expect(result.current.customTotalTime).toBe(50 * 60);
    expect(result.current.preset.name).toBe("Deep Work");
  });

  it("o tempo estudado com preset é salvo como sessão de foco, sem contar a pausa", async () => {
    const { result } = renderHook(() => usePomodoroTimer());
    act(() => result.current.setSelectedCourse("course-1"));
    const classic = result.current.builtInPresets.find((p) => p.name === "Pomodoro Clássico")!;
    act(() => result.current.changePreset(classic));

    act(() => result.current.toggleTimer()); // inicia
    act(() => vi.advanceTimersByTime(10 * 60 * 1000)); // 10 min estudando
    act(() => result.current.toggleTimer()); // pausa
    act(() => vi.advanceTimersByTime(30 * 60 * 1000)); // 30 min parado
    act(() => result.current.toggleTimer()); // retoma
    act(() => vi.advanceTimersByTime(5 * 60 * 1000)); // +5 min

    await act(async () => {
      await result.current.stopAndSave();
    });

    expect(enqueueFocusSession).toHaveBeenCalledTimes(1);
    expect(vi.mocked(enqueueFocusSession).mock.calls[0][0]).toMatchObject({
      course_id: "course-1",
      duration_minutes: 15,
      session_type: "work",
    });
  });

  it("sair e voltar à página Foco mantém o cronômetro rodando com o tempo certo", () => {
    const first = renderHook(() => usePomodoroTimer());
    act(() => {
      first.result.current.setSelectedCourse("course-1");
      first.result.current.setCustomTime(30 * 60, "work");
    });
    act(() => first.result.current.toggleTimer());
    act(() => vi.advanceTimersByTime(10 * 60 * 1000)); // 10 min
    first.unmount(); // foi para outra página

    act(() => vi.advanceTimersByTime(5 * 60 * 1000)); // 5 min fora do Foco

    const back = renderHook(() => usePomodoroTimer());
    expect(back.result.current.isRunning).toBe(true);
    expect(back.result.current.timeLeft).toBe(15 * 60);
    expect(back.result.current.selectedCourse).toBe("course-1");
    expect(back.result.current.sessionStartTime).not.toBeNull();
  });

  it("uma troca atrasada para o mesmo curso não zera o cronômetro restaurado", () => {
    const first = renderHook(() => usePomodoroTimer());
    act(() => {
      first.result.current.setSelectedCourse("course-1");
      first.result.current.setCustomTime(30 * 60, "work");
    });
    act(() => first.result.current.toggleTimer());
    act(() => vi.advanceTimersByTime(10 * 60 * 1000));
    first.unmount();

    const back = renderHook(() => usePomodoroTimer());
    // Callback do primeiro render (como uma busca que termina depois).
    const staleSetCourse = back.result.current.setSelectedCourse;
    act(() => staleSetCourse("course-1"));
    act(() => vi.advanceTimersByTime(1000));
    expect(back.result.current.isRunning).toBe(true);
    expect(back.result.current.timeLeft).toBe(20 * 60 - 1);
  });

  it("pausado, voltar à página mantém o tempo restante", () => {
    const first = renderHook(() => usePomodoroTimer());
    act(() => {
      first.result.current.setSelectedCourse("course-1");
      first.result.current.setCustomTime(30 * 60, "work");
    });
    act(() => first.result.current.toggleTimer());
    act(() => vi.advanceTimersByTime(12 * 60 * 1000));
    act(() => first.result.current.toggleTimer()); // pausa
    first.unmount();

    const back = renderHook(() => usePomodoroTimer());
    expect(back.result.current.isRunning).toBe(false);
    expect(back.result.current.timeLeft).toBe(18 * 60);
    expect(back.result.current.sessionStartTime).not.toBeNull();
  });

  it("ciclo que termina fora da página é salvo uma vez e o timer fica pronto para o próximo", async () => {
    const first = renderHook(() => usePomodoroTimer());
    act(() => {
      first.result.current.setSelectedCourse("course-1");
      first.result.current.setCustomTime(20 * 60, "work");
    });
    act(() => first.result.current.toggleTimer());
    first.unmount();

    act(() => vi.advanceTimersByTime(25 * 60 * 1000)); // terminou enquanto estava fora

    const back = renderHook(() => usePomodoroTimer());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(enqueueFocusSession).toHaveBeenCalledTimes(1);
    expect(vi.mocked(enqueueFocusSession).mock.calls[0][0]).toMatchObject({
      course_id: "course-1",
      duration_minutes: 20,
    });
    expect(back.result.current.isRunning).toBe(false);
    expect(back.result.current.timeLeft).toBe(20 * 60);
    expect(back.result.current.sessions).toBe(1);
  });
});
