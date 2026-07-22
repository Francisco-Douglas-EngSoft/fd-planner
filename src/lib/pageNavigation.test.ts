import { describe, it, expect } from "vitest";
import { clampPage, isPageCountLoading } from "./pageNavigation";

describe("clampPage", () => {
  it("mantém a página quando está dentro do intervalo", () => {
    expect(clampPage(5, 10)).toBe(5);
  });

  it("clampa para 1 quando o valor é menor que 1", () => {
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(-3, 10)).toBe(1);
  });

  it("clampa para o total quando excede o máximo (após troca de livro menor)", () => {
    // simula persistência restaurada com página 300 em livro novo de 120 págs
    expect(clampPage(300, 120)).toBe(120);
  });

  it("preserva o valor quando o total ainda não foi detectado", () => {
    expect(clampPage(42, 0)).toBe(42);
    expect(clampPage(0, 0)).toBe(1);
  });

  it("aceita strings numéricas", () => {
    expect(clampPage("7", 10)).toBe(7);
    expect(clampPage("999", 50)).toBe(50);
  });

  it("retorna 1 para entradas inválidas", () => {
    expect(clampPage("abc", 10)).toBe(1);
    expect(clampPage(NaN, 10)).toBe(1);
  });

  it("arredonda para baixo valores fracionários", () => {
    expect(clampPage(3.9, 10)).toBe(3);
  });
});

describe("isPageCountLoading", () => {
  it("é true enquanto numPages não foi detectado", () => {
    expect(isPageCountLoading(0)).toBe(true);
    expect(isPageCountLoading(-1)).toBe(true);
  });
  it("é false quando há total válido", () => {
    expect(isPageCountLoading(1)).toBe(false);
    expect(isPageCountLoading(500)).toBe(false);
  });
});

describe("cenários de re-sincronização", () => {
  it("após troca de livro, X/Total nunca ultrapassa o novo total", () => {
    const persistedPage = 250;
    const newBookTotal = 80;
    const synced = clampPage(persistedPage, newBookTotal);
    expect(synced).toBeLessThanOrEqual(newBookTotal);
    expect(synced).toBe(80);
  });

  it("após restauração de persistência com total ainda 0, mantém a página até o total chegar", () => {
    const persisted = 42;
    const beforeLoad = clampPage(persisted, 0);
    expect(beforeLoad).toBe(42);
    const afterLoad = clampPage(beforeLoad, 100);
    expect(afterLoad).toBe(42);
  });
});