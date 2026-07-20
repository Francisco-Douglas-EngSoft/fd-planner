import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Mock Supabase — the timer talks to auth.getUser() when a session finishes.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
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

describe("usePomodoroTimer", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
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
});