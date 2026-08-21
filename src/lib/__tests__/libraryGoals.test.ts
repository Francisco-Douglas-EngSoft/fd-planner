import { describe, expect, it } from "vitest";
import {
  computeLibraryPlan,
  computeLibraryTotals,
  computePeriods,
  daysInclusive,
  isoDate,
} from "@/lib/libraryGoals";

describe("computeLibraryTotals", () => {
  it("soma páginas e conta livro concluído por inteiro", () => {
    const t = computeLibraryTotals([
      { total_pages: 100, last_read_page: 40 },
      { total_pages: 200, last_read_page: 0, status: "completed" },
      { total_pages: null },
    ]);
    expect(t.total).toBe(300);
    expect(t.read).toBe(240);
    expect(t.remaining).toBe(60);
    expect(t.missing).toBe(1);
    expect(t.pct).toBe(80);
  });
});

describe("computeLibraryPlan", () => {
  const totals = computeLibraryTotals([{ total_pages: 1000, last_read_page: 100 }]);

  it("calcula ritmo necessário pelas páginas restantes", () => {
    const plan = computeLibraryPlan({
      totals,
      startISO: "2026-01-01",
      endISO: "2026-01-10",
      dailyPages: 20,
      useLibraryPace: true,
      today: new Date("2026-01-01T12:00:00"),
    });
    expect(plan.totalDays).toBe(10);
    expect(plan.remainingDays).toBe(10);
    expect(plan.requiredPerDay).toBe(90);
    expect(plan.effectiveDailyPages).toBe(90);
  });

  it("mantém meta manual quando o modo automático está desligado", () => {
    const plan = computeLibraryPlan({
      totals,
      startISO: "2026-01-01",
      endISO: "2026-01-10",
      dailyPages: 20,
      useLibraryPace: false,
      today: new Date("2026-01-06T12:00:00"),
    });
    expect(plan.elapsedDays).toBe(6);
    expect(plan.remainingDays).toBe(5);
    expect(plan.effectiveDailyPages).toBe(20);
    expect(plan.expectedRead).toBe(600);
    expect(plan.onPace).toBe(false);
  });
});

describe("computePeriods", () => {
  it("meta do período = meta diária × dias do período", () => {
    const today = new Date("2026-01-15T12:00:00");
    const byDay = new Map([[isoDate(today), { pages: 10, minutes: 15 }]]);
    const periods = computePeriods({ byDay, dailyPages: 20, dailyMinutes: 30, monthlyBooks: 2, today });
    const monthly = periods.find((p) => p.key === "monthly")!;
    expect(monthly.totalDays).toBe(31);
    expect(monthly.pagesGoal).toBe(620);
    expect(monthly.minutesGoal).toBe(930);
    expect(monthly.pages).toBe(10);
    expect(monthly.booksGoal).toBe(2);
    expect(daysInclusive(today, today)).toBe(1);
  });
});
