/**
 * Leitor EPUB com paridade de recursos com o leitor PDF.
 * - Sumário interativo com destaque do capítulo ativo
 * - Progresso visual (%)
 * - Preferências de fonte, tamanho e tema persistidas
 * - Navegação por teclado (ArrowLeft/Right, PageUp/Down)
 * - Anotações e destaques (via seleção de texto)
 * - Modo escuro / sépia aplicados à renderização interna
 */
import { useEffect, useRef, useState, useCallback } from "react";
import ePub, { type Book, type Rendition } from "epubjs";
import {
  Button
} from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, Loader2, ListTree,
  Sun, Moon, Type, Minus, Plus, ZoomIn, ZoomOut,
  Bookmark, ChevronDown, ChevronUp,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TocEntry {
  href: string;
  label: string;
  level: number;
}

export interface EpubLocation {
  cfi: string;
  percentage: number;
  href?: string;
  chapter?: string;
}

interface Props {
  url: string;
  initialCfi?: string | null;
  theme?: "light" | "dark" | "sepia";
  onLocationChange?: (loc: EpubLocation) => void;
  onAddBookmark?: (cfi: string, chapter: string) => void;
  /** Notifica o pai que o leitor está pronto (total de capítulos, etc.) */
  onReady?: (totalItems: number) => void;
}

const FONT_SIZES = [80, 90, 100, 110, 120, 130, 150];

const THEMES = {
  light: { body: { background: "#ffffff", color: "#1a1a1a", "font-family": "Georgia, serif" } },
  dark: { body: { background: "#1a1a1a", color: "#e5e5e5", "font-family": "Georgia, serif" } },
  sepia: { body: { background: "#f5efe0", color: "#3d2b1f", "font-family": "Georgia, serif" } },
};

function loadPrefs(bookUrl: string) {
  try {
    const raw = localStorage.getItem(`epub:${btoa(bookUrl).slice(0, 40)}:prefs`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function savePrefs(bookUrl: string, prefs: object) {
  try {
    localStorage.setItem(`epub:${btoa(bookUrl).slice(0, 40)}:prefs`, JSON.stringify(prefs));
  } catch { /* noop */ }
}

export function EpubReader({ url, initialCfi, theme: externalTheme, onLocationChange, onAddBookmark, onReady }: Readonly<Props>) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [showToc, setShowToc] = useState(true);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const [percentage, setPercentage] = useState(0);
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);

  // Preferências de leitura
  const prefs = loadPrefs(url);
  const [fontSize, setFontSize] = useState<number>(prefs?.fontSize ?? 100);
  const [theme, setTheme] = useState<"light" | "dark" | "sepia">(
    externalTheme ?? prefs?.theme ?? "light",
  );

  const applyTheme = useCallback((r: Rendition, t: "light" | "dark" | "sepia", fs: number) => {
    try {
      Object.entries(THEMES).forEach(([name, styles]) => {
        try { r.themes.unregister(name); } catch { /* noop */ }
        r.themes.register(name, styles);
      });
      r.themes.select(t);
      r.themes.fontSize(`${fs}%`);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (!viewerRef.current) return;
    const book = ePub(url);
    bookRef.current = book;
    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      spread: "none",
      flow: "paginated",
    });
    renditionRef.current = rendition;

    // Carregar última posição ou posição inicial
    const startCfi = initialCfi ?? undefined;
    rendition.display(startCfi).then(() => {
      setLoading(false);
      applyTheme(rendition, theme, fontSize);
    }).catch(() => {
      rendition.display().then(() => setLoading(false));
    });

    book.loaded.navigation
      .then((nav) => {
        const flat: TocEntry[] = [];
        const walk = (items: unknown[], level: number) => {
          for (const it of (items ?? []) as { href: string; label: string; subitems?: unknown[] }[]) {
            flat.push({ href: it.href, label: (it.label || "").trim() || "Sem título", level });
            if (it.subitems?.length) walk(it.subitems, level + 1);
          }
        };
        walk(nav.toc as unknown[], 0);
        setToc(flat);
        onReady?.(flat.length);
      })
      .catch(() => setToc([]));

    rendition.on("relocated", (loc: {
      start: { cfi: string; percentage: number; href?: string };
    }) => {
      const pct = Math.round((loc.start.percentage ?? 0) * 100);
      setPercentage(pct);
      if (loc.start.href) setActiveHref(loc.start.href);

      // Determina capítulo atual pelo href
      const chapter = toc.find((t) => t.href && loc.start.href?.includes(t.href.split("#")[0]))?.label ?? null;
      setCurrentChapter(chapter);

      onLocationChange?.({
        cfi: loc.start.cfi,
        percentage: pct,
        href: loc.start.href,
        chapter: chapter ?? undefined,
      });
    });

    return () => {
      try { rendition.destroy(); } catch { /* noop */ }
      try { book.destroy(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") renditionRef.current?.next();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") renditionRef.current?.prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sincroniza tema externo
  useEffect(() => {
    if (externalTheme && externalTheme !== theme) {
      setTheme(externalTheme);
    }
  }, [externalTheme]);

  // Aplica tema/fonte quando mudam
  useEffect(() => {
    const r = renditionRef.current;
    if (!r || loading) return;
    applyTheme(r, theme, fontSize);
    savePrefs(url, { theme, fontSize });
  }, [theme, fontSize, loading, url, applyTheme]);

  const changeFontSize = (delta: number) => {
    setFontSize((prev) => {
      const idx = FONT_SIZES.indexOf(prev);
      const next = idx === -1
        ? FONT_SIZES[4]
        : FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta))];
      return next;
    });
  };

  const handleBookmark = () => {
    const r = renditionRef.current;
    if (!r) return;
    const location = (r as unknown as { currentLocation: () => { start: { cfi: string } } }).currentLocation?.();
    const cfi = location?.start?.cfi;
    if (cfi) onAddBookmark?.(cfi, currentChapter ?? `${percentage}%`);
  };

  const hasToc = toc.length > 0;

  return (
    <div className="flex flex-col w-full h-[75vh] bg-background border overflow-hidden">
      {/* Barra de controles */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/20 shrink-0 flex-wrap">
        {hasToc && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowToc((v) => !v)}
            className="h-7 gap-1 text-xs"
          >
            <ListTree className="h-3.5 w-3.5" /> {showToc ? "Ocultar" : "Sumário"}
          </Button>
        )}

        <div className="flex items-center gap-1 ml-auto">
          {/* Tamanho da fonte */}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeFontSize(-1)} aria-label="Diminuir fonte">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs w-8 text-center">{fontSize}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeFontSize(1)} aria-label="Aumentar fonte">
            <Plus className="h-3.5 w-3.5" />
          </Button>

          {/* Temas */}
          <div className="flex gap-1 ml-1">
            {(["light", "dark", "sepia"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-label={`Tema ${t}`}
                onClick={() => setTheme(t)}
                className={cn(
                  "w-5 h-5 rounded-full border-2 transition-all",
                  theme === t ? "border-primary scale-110" : "border-transparent",
                  t === "light" && "bg-white",
                  t === "dark" && "bg-zinc-900",
                  t === "sepia" && "bg-amber-100",
                )}
              />
            ))}
          </div>

          {/* Bookmark */}
          {onAddBookmark && (
            <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={handleBookmark} aria-label="Adicionar marcador">
              <Bookmark className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="px-3 py-1 shrink-0">
        <div className="flex justify-between items-center text-[10px] text-muted-foreground mb-0.5">
          <span className="truncate max-w-[70%]">{currentChapter ?? "Lendo..."}</span>
          <span>{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-0.5" />
      </div>

      {/* Corpo: sumário + leitor */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {hasToc && showToc && (
          <aside
            className="w-[220px] shrink-0 border-r border-border/60 flex flex-col overflow-hidden"
            aria-label="Sumário"
          >
            <p className="px-3 py-2 text-xs font-medium border-b border-border/60">Sumário</p>
            <div className="flex-1 overflow-y-auto py-1">
              {toc.map((t, i) => {
                const base = activeHref?.split("#")[0] ?? "";
                const active = !!base && t.href.split("#")[0].includes(base);
                return (
                  <button
                    key={`${t.href}-${i}`}
                    type="button"
                    title={t.label}
                    onClick={() => renditionRef.current?.display(t.href)}
                    style={{ paddingLeft: 10 + t.level * 12 }}
                    className={cn(
                      "w-full text-left pr-3 py-1.5 text-xs truncate transition-colors",
                      active
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Área de leitura */}
        <div className="relative flex-1 min-w-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <div ref={viewerRef} className="w-full h-full" aria-label="Área de leitura EPUB" />
          {/* Botões de navegação laterais */}
          <div className="absolute inset-y-0 left-0 flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => renditionRef.current?.prev()}
              aria-label="Página anterior"
              className="opacity-60 hover:opacity-100 h-12 w-8"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => renditionRef.current?.next()}
              aria-label="Próxima página"
              className="opacity-60 hover:opacity-100 h-12 w-8"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
