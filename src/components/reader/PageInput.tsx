import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { clampPage } from "@/lib/pageNavigation";

interface PageInputProps {
  page: number;
  totalPages: number;
  onCommit: (page: number) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Campo de página do leitor.
 * - Enter: comita o valor (com clamp automático dentro do intervalo).
 * - Esc: descarta a edição, volta para o valor atual e desfoca.
 * - Blur: comita o valor.
 * - Enquanto o campo está em foco, o valor externo não sobrescreve o rascunho
 *   (evita perda de foco/valor quando o PDF renderiza).
 */
export function PageInput({ page, totalPages, onCommit, className, disabled }: PageInputProps) {
  const [draft, setDraft] = useState(String(page));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) setDraft(String(page));
  }, [page, focused]);

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(page));
      return;
    }
    const next = clampPage(parsed, totalPages);
    setDraft(String(next));
    if (next !== page) onCommit(next);
  };

  return (
    <Input
      ref={inputRef}
      type="number"
      inputMode="numeric"
      min={1}
      max={totalPages || undefined}
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          inputRef.current?.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setDraft(String(page));
          inputRef.current?.blur();
        }
      }}
      className={className}
      aria-label="Página atual"
    />
  );
}