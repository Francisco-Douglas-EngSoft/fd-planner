import { describe, it, expect } from "vitest";
import {
  MB,
  checkUploadFit,
  storageLevel,
  summarizeStorage,
  STORAGE_BUDGET_BYTES,
  STORAGE_LIMIT_BYTES,
} from "../libraryStorage";

describe("meta de armazenamento", () => {
  it("a meta é 800 MB e o limite real é 1 GB", () => {
    expect(STORAGE_BUDGET_BYTES).toBe(800 * MB);
    expect(STORAGE_LIMIT_BYTES).toBe(1024 * MB);
  });

  it("passar dos 800 MB avisa, mas deixa enviar", () => {
    const fit = checkUploadFit(790 * MB, 20 * MB);
    expect(fit.warn).toBe(true);
    expect(fit.blocked).toBe(false);
    expect(fit.level).toBe("over-budget");
  });

  it("passar de 1 GB bloqueia o envio", () => {
    const fit = checkUploadFit(1000 * MB, 30 * MB);
    expect(fit.blocked).toBe(true);
  });

  it("abaixo de 800 MB não avisa", () => {
    const fit = checkUploadFit(500 * MB, 10 * MB);
    expect(fit.warn).toBe(false);
    expect(fit.blocked).toBe(false);
  });

  it("a partir de 80% da meta (640 MB) mostra 'quase cheio'", () => {
    expect(storageLevel(639 * MB)).toBe("ok");
    expect(storageLevel(640 * MB)).toBe("near");
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
