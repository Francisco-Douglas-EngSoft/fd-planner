import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RichTextEditor, plainTextToHtml } from "../RichTextEditor";

// Mocks para dependências externas usadas pelo editor.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ upload: vi.fn(), createSignedUrl: vi.fn() }) } },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("plainTextToHtml", () => {
  it("converte parágrafos separados por linha em branco", () => {
    expect(plainTextToHtml("a\n\nb")).toBe("<p>a</p><p>b</p>");
  });

  it("converte quebras simples em <br>", () => {
    expect(plainTextToHtml("linha1\nlinha2")).toBe("<p>linha1<br>linha2</p>");
  });

  it("preserva múltiplos espaços com nbsp", () => {
    const html = plainTextToHtml("a   b");
    expect(html).toContain("\u00A0\u00A0\u00A0");
  });

  it("escapa HTML potencialmente perigoso", () => {
    expect(plainTextToHtml("<script>x</script>")).toBe(
      "<p>&lt;script&gt;x&lt;/script&gt;</p>",
    );
  });

  it("normaliza CRLF do Windows", () => {
    expect(plainTextToHtml("a\r\n\r\nb")).toBe("<p>a</p><p>b</p>");
  });
});

describe("RichTextEditor - teclado", () => {
  it("renderiza a área editável (contenteditable ProseMirror)", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <RichTextEditor content="<p>ola</p>" onChange={onChange} />,
    );
    const pm = container.querySelector(".ProseMirror") as HTMLElement | null;
    expect(pm).not.toBeNull();
    expect(pm!.getAttribute("contenteditable")).toBe("true");
  });

  it("não propaga Enter/Espaço para handlers externos", () => {
    const onChange = vi.fn();
    const outerKeyDown = vi.fn();
    const { container } = render(
      <div onKeyDown={outerKeyDown}>
        <RichTextEditor content="" onChange={onChange} />
      </div>,
    );
    const pm = container.querySelector(".ProseMirror") as HTMLElement;
    fireEvent.keyDown(pm, { key: "Enter" });
    fireEvent.keyDown(pm, { key: " " });
    // onKeyDownCapture no editor chama stopPropagation → nada chega no wrapper externo.
    expect(outerKeyDown).not.toHaveBeenCalled();
  });

  it("Enter cria novo parágrafo persistente no HTML", () => {
    const onChange = vi.fn();
    const { container } = render(
      <RichTextEditor content="<p>linha 1</p>" onChange={onChange} />,
    );
    const pm = container.querySelector(".ProseMirror") as HTMLElement;
    pm.focus();

    fireEvent.keyDown(pm, { key: "Enter", code: "Enter" });
    fireEvent.input(pm, { inputType: "insertParagraph", data: null });

    const lastHtml = onChange.mock.calls.at(-1)?.[0] ?? pm.innerHTML;
    expect(lastHtml).toMatch(/<p>linha 1<\/p><p>|<p><\/p>|<p><br><\/p>/);
  });

  it("Shift+Enter cria quebra simples persistente no HTML", () => {
    const onChange = vi.fn();
    const { container } = render(
      <RichTextEditor content="<p>linha 1</p>" onChange={onChange} />,
    );
    const pm = container.querySelector(".ProseMirror") as HTMLElement;
    pm.focus();

    fireEvent.keyDown(pm, { key: "Enter", code: "Enter", shiftKey: true });
    fireEvent.input(pm, { inputType: "insertLineBreak", data: null });

    const lastHtml = onChange.mock.calls.at(-1)?.[0] ?? pm.innerHTML;
    expect(lastHtml).toContain("<br");
  });

  it("expõe barra de ferramentas com botão de negrito", () => {
    render(<RichTextEditor content="" onChange={() => {}} />);
    expect(screen.getByTitle("Negrito")).toBeInTheDocument();
    expect(screen.getByTitle("Título 1")).toBeInTheDocument();
  });
});