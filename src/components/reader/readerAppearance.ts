import { useCallback, useEffect, useState } from "react";

export type ReaderMode = "normal" | "sepia" | "night" | "dim";

export interface ReaderAppearance {
  mode: ReaderMode;
  /** 50–110 (%) */
  brightness: number;
  /** PDF: rolagem contínua em vez de página a página. */
  continuous: boolean;
}

const KEY = "reader:appearance:v1";
const DEFAULTS: ReaderAppearance = { mode: "normal", brightness: 100, continuous: false };

function load(): ReaderAppearance {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ReaderAppearance>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/** Preferências visuais do leitor, iguais para todos os livros. */
export function useReaderAppearance() {
  const [state, setState] = useState<ReaderAppearance>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* noop */
    }
  }, [state]);
  const update = useCallback((patch: Partial<ReaderAppearance>) => setState((s) => ({ ...s, ...patch })), []);
  return [state, update] as const;
}

/** Filtro CSS aplicado à página do PDF. */
export function pageFilter({ mode, brightness }: Pick<ReaderAppearance, "mode" | "brightness">): string | undefined {
  const parts: string[] = [];
  if (mode === "sepia") parts.push("sepia(0.45) saturate(0.9) contrast(0.96)");
  if (mode === "night") parts.push("invert(1) hue-rotate(180deg)");
  if (mode === "dim") parts.push("invert(0.86) hue-rotate(180deg) contrast(0.88)");
  if (brightness !== 100) parts.push(`brightness(${brightness / 100})`);
  return parts.length ? parts.join(" ") : undefined;
}

export const MODE_LABELS: Record<ReaderMode, string> = {
  normal: "Normal",
  sepia: "Sépia",
  dim: "Escuro suave",
  night: "Noturno",
};
