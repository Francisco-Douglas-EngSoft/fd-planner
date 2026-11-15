import { describe, expect, it } from "vitest";
import { isoDate } from "@/lib/libraryGoals";
import { buildReadingSchedule, firstReadDates, forecastPeriods } from "@/lib/readingForecast";

const today = new Date("2026-11-15T12:00:00");

const books = [
  { id: "q1", title: "Fila 1", total_pages: 100, last_read_page: 0, status: "to_read", created_at: "2026-01-01T00:00:00Z" },
  { id: "r1", title: "Lendo", total_pages: 100, last_read_page: 60, status: "reading", updated_at: "2026-11-10T00:00:00Z" },
  { id: "q2", title: "Fila 2", total_pages: 50, last_read_page: 0, status: "to_read", created_at: "2026-02-01T00:00:00Z" },
  { id: "c1", title: "Feito", total_pages: 300, status: "completed", created_at: "2026-09-01T00:00:00Z", updated_at: "2026-10-20T12:00:00Z" },
  { id: "x1", title: "Sem páginas", total_pages: null, status: "to_read" },
];

describe("buildReadingSchedule", () => {
  const s = buildReadingSchedule({
    books,
    dailyPages: 20,
    dailyMinutes: 40,
    startISO: "2026-11-01",
    deadlineISO: "2026-11-25",
    firstReadByBook: new Map([["r1", "2026-11-02"]]),
    today,
  });

  it("coloca o livro em leitura antes da fila e a fila por ordem de cadastro", () => {
    expect(s.slice(0, 3).map((b) => b.id)).toEqual(["r1", "q1", "q2"]);
    expect(s[3].status).toBe("completed");
    expect(s[4].status).toBe("no_pages");
  });

  it("40 páginas restantes a 20/dia terminam no 2º dia, mantendo a data real de início", () => {
    expect(isoDate(s[0].start!)).toBe("2026-11-02");
    expect(s[0].startIsProjected).toBe(false);
    expect(isoDate(s[0].end!)).toBe("2026-11-16");
  });

  it("o próximo livro começa no dia seguinte quando o dia já está cheio", () => {
    expect(isoDate(s[1].start!)).toBe("2026-11-17");
    expect(isoDate(s[1].end!)).toBe("2026-11-21");
    expect(isoDate(s[2].start!)).toBe("2026-11-22");
    expect(isoDate(s[2].end!)).toBe("2026-11-24");
  });

  it("tempo estimado segue a velocidade das metas (2 min por página)", () => {
    expect(s[0].estimatedMinutes).toBe(80);
    expect(s[1].estimatedMinutes).toBe(200);
  });

  it("marca se cada livro termina dentro do prazo do plano", () => {
    const tight = buildReadingSchedule({ books, dailyPages: 20, dailyMinutes: 40, startISO: "2026-11-01", deadlineISO: "2026-11-20", today });
    expect(tight.find((b) => b.id === "r1")!.withinDeadline).toBe(true);
    expect(tight.find((b) => b.id === "q1")!.withinDeadline).toBe(false);
  });

  it("um livro começa no mesmo dia em que o anterior termina se sobrar capacidade", () => {
    const r = buildReadingSchedule({
      books: [
        { id: "a", title: "A", total_pages: 30, status: "to_read", created_at: "2026-01-01" },
        { id: "b", title: "B", total_pages: 30, status: "to_read", created_at: "2026-01-02" },
      ],
      dailyPages: 20,
      dailyMinutes: 30,
      startISO: "2026-11-15",
      today,
    });
    expect(isoDate(r[0].end!)).toBe("2026-11-16");
    expect(isoDate(r[1].start!)).toBe("2026-11-16");
    expect(isoDate(r[1].end!)).toBe("2026-11-17");
  });

  it("plano com início no futuro começa a previsão nessa data", () => {
    const r = buildReadingSchedule({ books: [books[0]], dailyPages: 50, dailyMinutes: 60, startISO: "2026-12-01", today });
    expect(isoDate(r[0].start!)).toBe("2026-12-01");
    expect(isoDate(r[0].end!)).toBe("2026-12-02");
  });
});

describe("forecastPeriods", () => {
  it("conta livros previstos por semana, mês, trimestre, semestre e ano", () => {
    const schedule = buildReadingSchedule({ books, dailyPages: 20, dailyMinutes: 40, startISO: "2026-11-01", today });
    const f = forecastPeriods({ schedule, dailyPages: 20, dailyMinutes: 40, startISO: "2026-11-01", today });
    expect(f.map((p) => p.label)).toEqual(["Semana", "Mês", "Trimestre", "Semestre", "Ano"]);
    // semana: 15/11 a 21/11 → "Lendo" (16/11) e "Fila 1" (21/11)
    expect(f[0].booksFinished).toBe(2);
    expect(f[0].titles).toEqual(["Lendo", "Fila 1"]);
    expect(f[1].booksFinished).toBe(3);
    expect(f[0].pages).toBe(140);
    expect(f[4].minutes).toBe(40 * 365);
  });

  it("capacidade = páginas do período ÷ média de páginas por livro", () => {
    const f = forecastPeriods({ schedule: [], dailyPages: 10, dailyMinutes: 20, startISO: "2026-11-15", avgPages: 300, today });
    expect(f[1].capacityBooks).toBe(1);
    expect(f[4].capacityBooks).toBe(12.1);
  });
});

describe("firstReadDates", () => {
  it("guarda a data mais antiga de cada livro", () => {
    const m = firstReadDates([
      { book_id: "a", date: "2026-05-03" },
      { book_id: "a", date: "2026-05-01" },
      { book_id: "b", date: "2026-06-01" },
    ]);
    expect(m.get("a")).toBe("2026-05-01");
    expect(m.get("b")).toBe("2026-06-01");
  });
});
