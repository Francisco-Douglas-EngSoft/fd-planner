/**
 * Leitor EPUB.
 * - Sumário interativo com destaque do capítulo ativo
 * - Progresso visual (%)
 * - Preferências (tema, tamanho, fonte, espaçamento, rolagem) iguais para todos os livros
 * - Navegação por teclado, deslizar e toque nas bordas (celular)
 */
import { useEffect, useRef, useState, useCallback } from "react";
import ePub, { type Book, type Rendition } from "epubjs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, ListTree, Bookmark, Type, Minus, Plus, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
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

type ThemeName = "light" | "sepia" | "dark";
type FontName = "original" | "serif" | "sans";

const FONT_SIZES = [80, 90, 100, 110, 120, 130, 150, 170];
const LINE_HEIGHTS = [1.4, 1.6, 1.8, 2.0];

// Cores da página do livro (dentro do leitor, não seguem o tema do app).
const THEME_COLORS: Record<ThemeName, { bg: string; fg: string; label: string }> = {
  light: { bg: "#ffffff", fg: "#1a1a1a", label: "Claro" },
  sepia: { bg: "#f5efe0", fg: "#3d2b1f", label: "Sépia" },
  dark: { bg: "#1a1a1a", fg: "#e5e5e5", label: "Escuro" },
};

const FONTS: Record<FontName, { label: string; css: string | null }> = {
  original: { label: "Do livro", css: null },
  serif: { label: "Serifada", css: "Georgia, 'Times New Roman', serif" },
  sans: { label: "Sem serifa", css: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
};

interface Prefs {
  theme: ThemeName;
  fontSize: number;
  font: FontName;
  lineHeight: number;
  scrolled: boolean;
}

const PREFS_KEY = "epub:prefs:v2";
const DEFAULT_PREFS: Prefs = { theme: "light", fontSize: 100, font: "original", lineHeight: 1.6, scrolled: false };

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function EpubReader({ url, initialCfi, theme: externalTheme, onLocationChange, onAddBookmark, onReady }: Readonly<Props>) {
  const isMobile = useIsMobile();
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const tocRef = useRef<TocEntry[]>([]);
  const cfiRef = useRef<string | null>(initialCfi ?? null);
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [showToc, setShowToc] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const [percentage, setPercentage] = useState(0);
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(() => ({ ...loadPrefs(), ...(externalTheme ? { theme: externalTheme } : {}) }));
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const updatePrefs = (patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch }));

  const applyPrefs = useCallback((r: Rendition, p: Prefs) => {
    try {
      const c = THEME_COLORS[p.theme];
      r.themes.register(p.theme, { body: { background: c.bg, color: c.fg } });
      r.themes.select(p.theme);
      r.themes.fontSize(`${p.fontSize}%`);
      const font = FONTS[p.font].css;
      const themes = r.themes as unknown as { override: (name: string, value: string, priority?: boolean) => void };
      themes.override("font-family", font ?? "inherit", !!font);
      themes.override("line-height", String(p.lineHeight), true);
    } catch { /* noop */ }
  }, []);

  const goNext = useCallback(() => renditionRef.current?.next(), []);
  const goPrev = useCallback(() => renditionRef.current?.prev(), []);

  useEffect(() => {
    if (!viewerRef.current) return;
    // Livro guardado no aparelho chega como blob: (sem extensão) — informa o formato.
    const book = url.startsWith("blob:") ? ePub(url, { openAs: "epub" }) : ePub(url);
    bookRef.current = book;
    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      spread: "none",
      flow: prefsRef.current.scrolled ? "scrolled-doc" : "paginated",
      allowScriptedContent: false,
    } as never);
    renditionRef.current = rendition;
    applyPrefs(rendition, prefsRef.current);

    rendition.display(cfiRef.current ?? undefined).then(() => {
      setLoading(false);
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
        tocRef.current = flat;
        setToc(flat);
        onReady?.(flat.length);
      })
      .catch(() => setToc([]));

    // Calcula as posições em segundo plano para que o % fique preciso.
    book.ready.then(() => book.locations.generate(1600)).catch(() => {});

    rendition.on("relocated", (loc: { start: { cfi: string; percentage: number; href?: string } }) => {
      const pct = Math.round((loc.start.percentage ?? 0) * 100);
      cfiRef.current = loc.start.cfi;
      setPercentage(pct);
      if (loc.start.href) setActiveHref(loc.start.href);
      const chapter = tocRef.current.find((t) => t.href && loc.start.href?.includes(t.href.split("#")[0]))?.label ?? null;
      setCurrentChapter(chapter);
      onLocationChange?.({ cfi: loc.start.cfi, percentage: pct, href: loc.start.href, chapter: chapter ?? undefined });
    });

    // Teclado e gestos dentro da página do livro (que fica num quadro separado).
    rendition.on("keyup", (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") rendition.next();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") rendition.prev();
    });
    let touch: { x: number; y: number; t: number } | null = null;
    rendition.on("touchstart", (e: TouchEvent) => {
      const t = e.changedTouches[0];
      touch = t ? { x: t.screenX, y: t.screenY, t: Date.now() } : null;
    });
    rendition.on("touchend", (e: TouchEvent) => {
      const start = touch;
      touch = null;
      const t = e.changedTouches[0];
      if (!start || !t || prefsRef.current.scrolled) return;
      const sel = (e.view as Window | null)?.getSelection?.();
      if (sel && !sel.isCollapsed) return;
      const dx = t.screenX - start.x;
      const dy = t.screenY - start.y;
      const dt = Date.now() - start.t;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 700) {
        if (dx < 0) rendition.next(); else rendition.prev();
        return;
      }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300) {
        const w = window.innerWidth;
        if (t.screenX < w * 0.22) rendition.prev();
        else if (t.screenX > w * 0.78) rendition.next();
      }
    });

    return () => {
      try { rendition.destroy(); } catch { /* noop */ }
      try { book.destroy(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Teclado (fora da página do livro)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") goNext();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    if (externalTheme) updatePrefs({ theme: externalTheme });
  }, [externalTheme]);

  // Aplica e guarda as preferências
  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* noop */ }
    const r = renditionRef.current;
    if (!r || loading) return;
    applyPrefs(r, prefs);
  }, [prefs, loading, applyPrefs]);

  // Troca entre páginas e rolagem mantendo a posição
  const scrolledRef = useRef(prefs.scrolled);
  useEffect(() => {
    const r = renditionRef.current;
    if (!r || loading || scrolledRef.current === prefs.scrolled) return;
    scrolledRef.current = prefs.scrolled;
    try {
      (r as unknown as { flow: (f: string) => void }).flow(prefs.scrolled ? "scrolled-doc" : "paginated");
      void r.display(cfiRef.current ?? undefined);
    } catch { /* noop */ }
  }, [prefs.scrolled, loading]);

  const stepFont = (delta: number) => {
    const idx = FONT_SIZES.indexOf(prefs.fontSize);
    const next = idx === -1 ? 100 : FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta))];
    updatePrefs({ fontSize: next });
  };

  const handleBookmark = () => {
    const r = renditionRef.current;
    if (!r) return;
    const location = (r as unknown as { currentLocation: () => { start: { cfi: string } } }).currentLocation?.();
    const cfi = location?.start?.cfi;
    if (cfi) onAddBookmark?.(cfi, currentChapter ?? `${percentage}%`);
  };

  const hasToc = toc.length > 0;
  const colors = THEME_COLORS[prefs.theme];

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-170px)] sm:h-[78vh] bg-background border overflow-hidden">
      {/* Barra de controles */}
      <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 border-b bg-muted/20 shrink-0">
        {hasToc && (
          <Button variant="ghost" size="sm" onClick={() => setShowToc((v) => !v)} className="h-9 sm:h-7 gap-1 text-xs">
            <ListTree className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">{showToc ? "Ocultar" : "Sumário"}</span>
          </Button>
        )}
        <span className="text-[11px] text-muted-foreground truncate flex-1 min-w-0">{currentChapter ?? ""}</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 sm:h-7 gap-1 text-xs" aria-label="Ajustes de leitura">
              <Type className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Aa</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold">Tema</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(THEME_COLORS) as ThemeName[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updatePrefs({ theme: t })}
                    aria-pressed={prefs.theme === t}
                    className={cn("h-10 border text-xs font-medium transition-all", prefs.theme === t ? "ring-2 ring-primary border-primary" : "border-border")}
                    style={{ background: THEME_COLORS[t].bg, color: THEME_COLORS[t].fg }}
                  >
                    {THEME_COLORS[t].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Tamanho do texto</p>
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => stepFont(-1)} aria-label="Diminuir fonte">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-sm tabular-nums">{prefs.fontSize}%</span>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => stepFont(1)} aria-label="Aumentar fonte">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Fonte</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(FONTS) as FontName[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => updatePrefs({ font: f })}
                    aria-pressed={prefs.font === f}
                    className={cn("h-9 border text-xs transition-colors", prefs.font === f ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground")}
                    style={{ fontFamily: FONTS[f].css ?? undefined }}
                  >
                    {FONTS[f].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Espaço entre linhas</p>
              <div className="grid grid-cols-4 gap-2">
                {LINE_HEIGHTS.map((lh) => (
                  <button
                    key={lh}
                    type="button"
                    onClick={() => updatePrefs({ lineHeight: lh })}
                    aria-pressed={prefs.lineHeight === lh}
                    className={cn("h-9 border text-xs tabular-nums transition-colors", prefs.lineHeight === lh ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground")}
                  >
                    {lh.toLocaleString("pt-BR")}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 text-xs cursor-pointer">
              <span>
                <span className="font-semibold block">Rolagem contínua</span>
                <span className="text-muted-foreground">Role o capítulo em vez de virar páginas</span>
              </span>
              <Switch checked={prefs.scrolled} onCheckedChange={(c) => updatePrefs({ scrolled: c })} />
            </label>
          </PopoverContent>
        </Popover>

        {onAddBookmark && (
          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-7 sm:w-7" onClick={handleBookmark} aria-label="Adicionar marcador">
            <Bookmark className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </Button>
        )}
      </div>

      {/* Barra de progresso */}
      <div className="px-3 py-1 shrink-0">
        <div className="flex justify-end items-center text-[10px] text-muted-foreground mb-0.5 tabular-nums">
          <span>{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-0.5" />
      </div>

      {/* Corpo: sumário + leitor */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {hasToc && showToc && (
          <aside
            className={cn(
              "shrink-0 border-r border-border/60 flex flex-col overflow-hidden bg-background",
              isMobile ? "absolute inset-y-0 left-0 z-20 w-[80%] max-w-[300px] shadow-2xl" : "w-[220px]",
            )}
            aria-label="Sumário"
          >
            <div className="px-3 py-2 text-xs font-medium border-b border-border/60 flex items-center justify-between">
              Sumário
              {isMobile && (
                <button type="button" onClick={() => setShowToc(false)} aria-label="Fechar sumário" className="text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {toc.map((t, i) => {
                const base = activeHref?.split("#")[0] ?? "";
                const active = !!base && t.href.split("#")[0].includes(base);
                return (
                  <button
                    key={`${t.href}-${i}`}
                    type="button"
                    title={t.label}
                    onClick={() => {
                      renditionRef.current?.display(t.href);
                      if (isMobile) setShowToc(false);
                    }}
                    style={{ paddingLeft: 10 + t.level * 12 }}
                    className={cn(
                      "w-full text-left pr-3 py-2 sm:py-1.5 text-xs truncate transition-colors",
                      active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
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
        <div className="relative flex-1 min-w-0" style={{ background: colors.bg }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <div ref={viewerRef} className="w-full h-full" aria-label="Área de leitura EPUB" />
          {!prefs.scrolled && !isMobile && (
            <>
              <div className="absolute inset-y-0 left-0 flex items-center">
                <Button variant="ghost" size="icon" onClick={goPrev} aria-label="Página anterior" className="opacity-60 hover:opacity-100 h-12 w-8">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center">
                <Button variant="ghost" size="icon" onClick={goNext} aria-label="Próxima página" className="opacity-60 hover:opacity-100 h-12 w-8">
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navegação inferior no celular */}
      {isMobile && !prefs.scrolled && (
        <div className="flex items-center justify-between border-t px-2 py-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-10 gap-1" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <span className="text-[11px] text-muted-foreground">Deslize ou toque nas bordas</span>
          <Button variant="ghost" size="sm" className="h-10 gap-1" onClick={goNext}>
            Próxima <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
