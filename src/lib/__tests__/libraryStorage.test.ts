import { describe, it, expect } from "vitest";
import {
  MB,
  checkUploadFit,
  storageLevel,
  storageUsagePercent,
  formatPercent,
  summarizeStorage,
  STORAGE_BUDGET_BYTES,
  STORAGE_LIMIT_BYTES,
} from "../libraryStorage";

describe("meta de armazenamento", () => {
  const GB = 1024 * MB;

  it("a meta é 1,8 GB e o limite de envio é 2 GB", () => {
    expect(STORAGE_BUDGET_BYTES).toBe(Math.round(1.8 * GB));
    expect(STORAGE_LIMIT_BYTES).toBe(2 * GB);
  });

  it("passar de 1,8 GB avisa, mas deixa enviar", () => {
    const fit = checkUploadFit(1.79 * GB, 30 * MB);
    expect(fit.warn).toBe(true);
    expect(fit.blocked).toBe(false);
    expect(fit.level).toBe("over-budget");
  });

  it("passar de 2 GB bloqueia o envio", () => {
    const fit = checkUploadFit(2 * GB - 10 * MB, 30 * MB);
    expect(fit.blocked).toBe(true);
  });

  it("1 GB usado continua dentro da meta", () => {
    const fit = checkUploadFit(1 * GB, 10 * MB);
    expect(fit.warn).toBe(false);
    expect(fit.blocked).toBe(false);
  });

  it("a partir de 80% da meta (1,44 GB) mostra 'quase cheio'", () => {
    expect(storageLevel(1.43 * GB)).toBe("ok");
    expect(storageLevel(1.45 * GB)).toBe("near");
  });
});

describe("soma do armazenamento", () => {
  it("conta tudo do Storage, incluindo capas e outras pastas", () => {
    const s = summarizeStorage(
      [
        { bucket_id: "books", name: "u/a.pdf", size: 10 * MB },
        { bucket_id: "books", name: "u/covers/a.jpg", size: 1 * MB },
        { bucket_id: "course-covers", name: "u/c.png", size: 2 * MB },
        { bucket_id: "note-images", name: "u/n.png", size: 3 * MB },
      ],
      [{ id: "b1", file_path: "u/a.pdf", cover_path: "u/covers/a.jpg" }],
    );
    expect(s.total).toBe(16 * MB);
    expect(s.perBook.get("b1")).toEqual({ file: 10 * MB, cover: 1 * MB, total: 11 * MB });
    expect(s.byBucket["course-covers"]).toBe(2 * MB);
  });

  it("arquivo de livro sem livro cadastrado é marcado como órfão", () => {
    const s = summarizeStorage(
      [
        { bucket_id: "books", name: "u/a.pdf", size: 5 },
        { bucket_id: "books", name: "u/solto.pdf", size: 7 },
      ],
      [{ id: "b1", file_path: "u/a.pdf" }],
    );
    expect(s.orphans.map((o) => o.name)).toEqual(["u/solto.pdf"]);
  });

  it("sem listagem do Storage, usa o tamanho gravado no livro", () => {
    const s = summarizeStorage([], [{ id: "b1", file_path: "u/a.pdf", file_size: 42 }]);
    expect(s.perBook.get("b1")?.total).toBe(42);
  });
});

describe("porcentagem real usada do servidor (2 GB)", () => {
  const GB = 1024 * MB;

  it("1 GB usado = 50% dos 2 GB", () => {
    expect(storageUsagePercent(1 * GB)).toBe(50);
  });

  it("1,8 GB usado = 90%", () => {
    expect(storageUsagePercent(1.8 * GB)).toBeCloseTo(90, 5);
  });

  it("nunca passa de 100% nem fica negativo", () => {
    expect(storageUsagePercent(3 * GB)).toBe(100);
    expect(storageUsagePercent(-5)).toBe(0);
  });

  it("formata em português", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.04)).toBe("<0,1%");
    expect(formatPercent(storageUsagePercent(256 * MB))).toBe("12,5%");
  });
});
