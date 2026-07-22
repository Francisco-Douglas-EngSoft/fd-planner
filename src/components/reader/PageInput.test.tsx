import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PageInput } from "./PageInput";

describe("PageInput", () => {
  it("comita o valor no Enter e mantém dentro do intervalo", () => {
    const onCommit = vi.fn();
    render(<PageInput page={1} totalPages={50} onCommit={onCommit} />);
    const input = screen.getByLabelText("Página atual") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledWith(50);
  });

  it("descarta o rascunho no Esc", () => {
    const onCommit = vi.fn();
    render(<PageInput page={7} totalPages={50} onCommit={onCommit} />);
    const input = screen.getByLabelText("Página atual") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe("7");
  });

  it("comita no blur", () => {
    const onCommit = vi.fn();
    render(<PageInput page={1} totalPages={50} onCommit={onCommit} />);
    const input = screen.getByLabelText("Página atual") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(12);
  });

  it("não sobrescreve rascunho enquanto o campo está focado", () => {
    const onCommit = vi.fn();
    const { rerender } = render(<PageInput page={1} totalPages={50} onCommit={onCommit} />);
    const input = screen.getByLabelText("Página atual") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "33" } });
    // Simula re-render vindo de fora (ex.: rerender após troca de página no PDF)
    rerender(<PageInput page={2} totalPages={50} onCommit={onCommit} />);
    expect(input.value).toBe("33");
  });

  it("atualiza o valor exibido quando não está focado", () => {
    const onCommit = vi.fn();
    const { rerender } = render(<PageInput page={1} totalPages={50} onCommit={onCommit} />);
    rerender(<PageInput page={9} totalPages={50} onCommit={onCommit} />);
    const input = screen.getByLabelText("Página atual") as HTMLInputElement;
    expect(input.value).toBe("9");
  });

  it("fica desativado enquanto o total ainda não carregou", () => {
    render(<PageInput page={1} totalPages={0} onCommit={() => {}} disabled />);
    const input = screen.getByLabelText("Página atual") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});