import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Bookmark, Loader2, Sparkles,
  ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCw, Download, Moon, Sun,
  PanelLeft, Search as SearchIcon, StickyNote, ListOrdered, Trash2,
  Highlighter, ChevronUp, ChevronDown, GripVertical, Keyboard, X, ScanLine, Coffee,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { libraryService, type BookRow } from "@/services/libraryService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EpubReader } from "@/components/reader/EpubReader";
import { NotesPanel } from "@/components/reader/NotesPanel";
import { PageSummarizer } from "@/components/reader/PageSummarizer";
import { PdfTextLayer } from "@/components/reader/PdfTextLayer";
import { HighlightsLayer } from "@/components/reader/HighlightsLayer";
import { PdfThumbnails } from "@/components/reader/PdfThumbnails";
import { PdfOutline } from "@/components/reader/PdfOutline";
import { PdfSearch } from "@/components/reader/PdfSearch";
import { SelectionPopover } from "@/components/reader/SelectionPopover";
import { annotationsService, HIGHLIGHT_COLORS, type Annotation, type RectNorm } from "@/services/annotationsService";
import { PageInput } from "@/components/reader/PageInput";
import { clampPage, isPageCountLoading } from "@/lib/pageNavigation";

// pdfjs worker
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfjsLib as any).GlobalWorkerOptions.workerPort = new PdfWorker();

// Extensão do BookRow para colunas adicionadas via migration manual
type BookRowExt = BookRow & { last_read_scroll?: number | null };

export default function Reader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const pageBoxRef = useRef<HTMLDivElement>(null); // wrapper com dimensões da página atual

  const [book, setBook] = useState<BookRowExt | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdf, setPdf] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentPageObj, setCurrentPageObj] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentViewport, setCurrentViewport] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const sessionStart = useMemo(() => new Date(), []);

  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [fitPage, setFitPage] = useState(false);
  const [sepia, setSepia] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [invertColors, setInvertColors] = useState(false);

  const [showThumbs, setShowThumbs] = useState(true);
  const [leftPanel, setLeftPanel] = useState<"outline" | "thumbs">("outline");
  const [sidePanel, setSidePanel] = useState<"notes" | "search" | "highlights">("notes");

  // Fullscreen toolbar / atalhos / navegação de destaques
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [highlightNavIndex, setHighlightNavIndex] = useState(-1);
  const restoredPrefsRef = useRef(false);
  const initialSaveSkippedRef = useRef(false);
  const scrollRestoredRef = useRef(false);
  const suppressScrollResetRef = useRef(false);
  const lastPageRef = useRef<number | null>(null);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectionPopover, setSelectionPopover] = useState<
    | { x: number; y: number; rects: RectNorm[]; text: string }
    | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRects, setSearchRects] = useState<RectNorm[]>([]);

  const pageAnnotations = useMemo(
    () => annotations.filter((a) => a.page === page),
    [annotations, page],
  );

  const sortedAnnotations = useMemo(
    () =>
      [...annotations].sort(
        (a, b) => a.page - b.page || (a.rects?.[0]?.y ?? 0) - (b.rects?.[0]?.y ?? 0),
      ),
    [annotations],
  );

  // Highlights sintéticos para resultados de busca na página atual
  const searchAnnotations: Annotation[] = useMemo(() => {
    if (!searchRects.length) return [];
    return [
      {
        id: "__search__",
        book_id: "",
        user_id: "",
        page,
        text: searchQuery,
        highlight: null,
        color: "orange",
        kind: "highlight",
        rects: searchRects,
        created_at: "",
      },
    ];
  }, [searchRects, page, searchQuery]);

  // ---------------- Carrega o livro ----------------
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const b = (await libraryService.get(id)) as BookRowExt | null;
        if (!b) {
          toast.error("Livro não encontrado");
          navigate("/biblioteca");
          return;
        }
        setBook(b);
        setPage(b.last_read_page && b.last_read_page > 0 ? b.last_read_page : 1);
        const url = await libraryService.getSignedUrl(b.file_path, 3600);
        setSignedUrl(url);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar livro");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  // ---------------- Abre o PDF ----------------
  useEffect(() => {
    if (!signedUrl || !book) return;
    if (!book.file_path.toLowerCase().endsWith(".pdf")) return;
    // Ao trocar de livro/URL, zera o estado do PDF anterior antes de abrir o novo
    // para evitar contagens divergentes (X / Total do arquivo anterior).
    setPdf((prev: any) => {
      try { prev?.destroy?.(); } catch { /* noop */ }
      return null;
    });
    setTotalPages(0);
    setCurrentPageObj(null);
    setCurrentViewport(null);
    let cancelled = false;
    let loaded: any = null;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = await (pdfjsLib as any).getDocument({ url: signedUrl }).promise;
        if (cancelled) { try { doc?.destroy?.(); } catch { /* noop */ } return; }
        loaded = doc;
        setPdf(doc);
        const n: number = doc.numPages ?? 0;
        setTotalPages(n);
        // Re-sincroniza a página atual ao total detectado no arquivo real
        // (protege contra dados corrompidos, trocas de arquivo ou reload do PDF).
        setPage((p) => clampPage(p, n));
        if (n && (!book.total_pages || book.total_pages !== n)) {
          await libraryService.update(book.id, { total_pages: n });
          // Mantém o estado local sincronizado
          setBook((prev) => (prev ? { ...prev, total_pages: n } : prev));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error("Não foi possível abrir o PDF");
      }
    })();
    return () => {
      cancelled = true;
      try { loaded?.destroy?.(); } catch { /* noop */ }
    };
  }, [signedUrl, book]);

  // ---------------- Carrega anotações ----------------
  useEffect(() => {
    if (!book || !user) return;
    annotationsService
      .listByBook(book.id, user.id)
      .then(setAnnotations)
      .catch((err) => console.warn("Falha ao carregar anotações", err));
  }, [book, user]);

  // ---------------- Renderiza página ----------------
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        setRendering(true);
        const p = await pdf.getPage(page);
        const base = p.getViewport({ scale: 1, rotation });
        const containerWidth = pageContainerRef.current?.clientWidth ?? 800;
        const containerHeight = pageContainerRef.current?.clientHeight ?? 900;
        const availableWidth = Math.max(320, containerWidth - 32);
        const availableHeight = Math.max(320, containerHeight - 32);
        const fitScale = availableWidth / base.width;
        const pageScale = Math.min(fitScale, availableHeight / base.height);
        const baseScale = fitPage ? pageScale : fitWidth ? fitScale : 1;
        const effectiveScale = baseScale * zoom;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = p.getViewport({ scale: effectiveScale * dpr, rotation });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;
        if (cancelled) return;
        await p.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (!cancelled) {
          setCurrentPageObj(p);
          // viewport CSS (sem multiplicar por dpr) para textLayer/hitboxes
          setCurrentViewport(p.getViewport({ scale: effectiveScale, rotation }));
        }
      } finally {
        setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, page, zoom, fitWidth, fitPage, rotation]);

  // ---------------- Pré-carrega páginas vizinhas (paginação mais fluida) ----------------
  useEffect(() => {
    if (!pdf || !totalPages) return;
    let cancelled = false;
    const warm = async (n: number) => {
      if (n < 1 || n > totalPages) return;
      try {
        const p = await pdf.getPage(n);
        if (!cancelled) await p.getTextContent().catch(() => undefined);
      } catch { /* noop */ }
    };
    const t = setTimeout(() => {
      warm(page + 1);
      warm(page - 1);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pdf, page, totalPages]);

  // ---------------- Resize triggers rerender ----------------
  useEffect(() => {
    if (!fitWidth && !fitPage) return;
    const el = pageContainerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setPage((p) => p));
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [fitWidth, fitPage]);

  // ---------------- Fullscreen ----------------
  const isPdfPath = book?.file_path.toLowerCase().endsWith(".pdf");

  const toggleFullscreen = useCallback(async () => {
    const el = viewerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen?.().catch(() => {});
    else await document.exitFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---------------- Navegação entre destaques/notas ----------------
  const scrollToRect = useCallback((r: RectNorm) => {
    const el = pageContainerRef.current;
    const box = pageBoxRef.current;
    if (!el || !box) return;
    const targetTop = box.offsetTop + r.y * box.clientHeight - el.clientHeight / 3;
    el.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  }, []);

  const goToAnnotation = useCallback(
    (dir: 1 | -1) => {
      if (!sortedAnnotations.length) {
        toast.info("Nenhum destaque ou nota ainda");
        return;
      }
      let next = highlightNavIndex + dir;
      if (next < 0) next = sortedAnnotations.length - 1;
      if (next >= sortedAnnotations.length) next = 0;
      const target = sortedAnnotations[next];
      setHighlightNavIndex(next);
      const samePage = target.page === page;
      if (!samePage) {
        suppressScrollResetRef.current = true;
        setPage(target.page);
      }
      const rect = target.rects?.[0];
      if (rect) setTimeout(() => scrollToRect(rect), samePage ? 60 : 500);
      toast.message(
        `Destaque ${next + 1}/${sortedAnnotations.length} · Pág. ${target.page}`,
        { description: target.text?.slice(0, 120) },
      );
    },
    [sortedAnnotations, highlightNavIndex, page, scrollToRect],
  );

  // ---------------- Teclado ----------------
  useEffect(() => {
    if (!isPdfPath) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1));
      else if (e.key === "ArrowLeft" || e.key === "PageUp") setPage((p) => Math.max(1, p - 1));
      else if (e.key === "Home") setPage(1);
      else if (e.key === "End" && totalPages) setPage(totalPages);
      else if (e.key === "+" || e.key === "=") { setFitWidth(false); setFitPage(false); setZoom((z) => Math.min(4, z + 0.1)); }
      else if (e.key === "-") { setFitWidth(false); setFitPage(false); setZoom((z) => Math.max(0.4, z - 0.1)); }
      else if (e.key === "0") { setFitPage(false); setFitWidth(true); setZoom(1); }
      else if (e.key === "9") { setFitWidth(false); setFitPage(true); setZoom(1); }
      else if (e.key.toLowerCase() === "f") toggleFullscreen();
      else if (e.key === "N") goToAnnotation(-1);
      else if (e.key === "n") goToAnnotation(1);
      else if (e.key === "?") setShowShortcuts((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPdfPath, totalPages, toggleFullscreen, goToAnnotation]);

  // ---------------- Persistência de preferências (zoom + fullscreen) ----------------
  useEffect(() => {
    if (!book || restoredPrefsRef.current) return;
    try {
      const raw = localStorage.getItem(`reader:${book.id}:prefs`);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.zoom === "number") setZoom(saved.zoom);
        if (typeof saved.fitWidth === "boolean") setFitWidth(saved.fitWidth);
        if (typeof saved.fitPage === "boolean") setFitPage(saved.fitPage);
        if (typeof saved.sepia === "boolean") setSepia(saved.sepia);
        if (typeof saved.rotation === "number") setRotation(saved.rotation);
        if (typeof saved.invertColors === "boolean") setInvertColors(saved.invertColors);
        if (saved.fullscreen) {
          setTimeout(() => {
            viewerRef.current?.requestFullscreen?.().catch(() => {
              toast.info("Clique na página para retomar a tela cheia", { duration: 4000 });
              const resume = () => {
                viewerRef.current?.requestFullscreen?.().catch(() => {});
              };
              window.addEventListener("click", resume, { once: true });
            });
          }, 400);
        }
      }
    } catch { /* noop */ }
    restoredPrefsRef.current = true;
  }, [book]);

  useEffect(() => {
    if (!book || !restoredPrefsRef.current) return;
    try {
      localStorage.setItem(
        `reader:${book.id}:prefs`,
        JSON.stringify({ zoom, fitWidth, fitPage, sepia, rotation, invertColors, fullscreen: isFullscreen }),
      );
    } catch { /* noop */ }
  }, [book, zoom, fitWidth, fitPage, sepia, rotation, invertColors, isFullscreen]);

  // Colapsa toolbar em mobile ao entrar em fullscreen
  useEffect(() => {
    if (isFullscreen && window.matchMedia("(max-width: 640px)").matches) {
      setToolbarCollapsed(true);
    }
  }, [isFullscreen]);

  // Drag da toolbar em tela cheia
  const startToolbarDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!isFullscreen) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const initial = toolbarPos;
      e.preventDefault();
      const move = (ev: PointerEvent) => {
        setToolbarPos({
          x: initial.x + (ev.clientX - startX),
          y: initial.y + (ev.clientY - startY),
        });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [isFullscreen, toolbarPos],
  );

  // ---------------- Persistência de progresso ----------------
  useEffect(() => {
    if (!book) return;
    // Pula a primeira execução após montar — evita sobrescrever last_read_page antes
    // do PDF terminar de abrir e da página ser clampada.
    if (!initialSaveSkippedRef.current) {
      initialSaveSkippedRef.current = true;
      return;
    }
    // Só persiste páginas válidas (evita salvar 1 durante o carregamento)
    if (!totalPages || page < 1 || page > totalPages) return;
    const t = setTimeout(() => {
      const status = totalPages && page >= totalPages ? "completed" : "reading";
      libraryService.update(book.id, { last_read_page: page, status }).catch(console.error);
    }, 800);
    return () => clearTimeout(t);
  }, [page, book, totalPages]);

  // Restaura scroll dentro da página apenas uma vez, quando a página inicial termina de renderizar
  useEffect(() => {
    if (!book || rendering || scrollRestoredRef.current) return;
    if (page !== (book.last_read_page ?? 1)) return;
    const scroll = book.last_read_scroll ?? 0;
    if (scroll <= 0) return;
    const el = pageContainerRef.current;
    if (!el) return;
    const target = scroll * (el.scrollHeight - el.clientHeight);
    if (target > 0) el.scrollTop = target;
    scrollRestoredRef.current = true;
  }, [book, rendering, page]);

  // Ao trocar de página, sempre inicia a leitura no topo da nova página
  useEffect(() => {
    const el = pageContainerRef.current;
    if (!el) return;
    if (lastPageRef.current === page) return;
    const isFirstPageOfSession = lastPageRef.current === null;
    lastPageRef.current = page;
    // Não interfere na restauração do progresso salvo nem na navegação por destaques
    if (isFirstPageOfSession) return;
    if (suppressScrollResetRef.current) {
      suppressScrollResetRef.current = false;
      return;
    }
    el.scrollTop = 0;
    requestAnimationFrame(() => {
      pageContainerRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });
  }, [page]);

  // Garante o topo também quando a renderização do PDF termina (altura muda)
  useEffect(() => {
    if (rendering) return;
    if (suppressScrollResetRef.current) return;
    if (!scrollRestoredRef.current && (book?.last_read_scroll ?? 0) > 0) return;
    const el = pageContainerRef.current;
    if (!el || el.scrollTop === 0) return;
    if (lastPageRef.current !== page) el.scrollTop = 0;
  }, [rendering, page, book]);

  // Debounce salvamento de scroll
  useEffect(() => {
    const el = pageContainerRef.current;
    if (!el || !book) return;
    let t: number | undefined;
    const onScroll = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        const ratio = el.scrollHeight > el.clientHeight
          ? el.scrollTop / (el.scrollHeight - el.clientHeight)
          : 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        libraryService.update(book.id, { last_read_scroll: ratio } as any).catch(() => {});
      }, 600);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (t) window.clearTimeout(t);
    };
  }, [book, page]);

  // ---------------- Sessão de leitura → XP ----------------
  useEffect(() => {
    return () => {
      if (!book || !user) return;
      const end = new Date();
      const minutes = Math.max(1, Math.round((end.getTime() - sessionStart.getTime()) / 60000));
      if (minutes < 1) return;
      const today = end.toISOString().slice(0, 10);
      supabase.from("reading_sessions").insert({
        user_id: user.id, book_id: book.id, date: today, duration_minutes: minutes,
      }).then(({ error }) => error && console.error(error));
      supabase.from("focus_sessions").insert({
        user_id: user.id, duration_minutes: minutes, session_type: "work",
        notes: `Leitura: ${book.title}`,
      }).then(({ error }) => error && console.error(error));
    };
  }, [book, user, sessionStart]);

  // ---------------- Seleção de texto → popover ----------------
  const handleMouseUp = useCallback(() => {
    if (!pageBoxRef.current || !currentViewport) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionPopover(null);
      return;
    }
    const range = sel.getRangeAt(0);
    // ignora se seleção não estiver dentro do textLayer
    if (!pageBoxRef.current.contains(range.commonAncestorContainer)) return;
    const clientRects = Array.from(range.getClientRects());
    if (!clientRects.length) return;
    const boxRect = pageBoxRef.current.getBoundingClientRect();
    // Normaliza p/ fração do tamanho renderizado da página
    const rects: RectNorm[] = clientRects
      .filter((r) => r.width > 1 && r.height > 4)
      .map((r) => ({
        x: (r.left - boxRect.left) / boxRect.width,
        y: (r.top - boxRect.top) / boxRect.height,
        w: r.width / boxRect.width,
        h: r.height / boxRect.height,
      }));
    if (!rects.length) return;
    const last = clientRects[clientRects.length - 1];
    setSelectionPopover({
      x: last.left - boxRect.left,
      y: last.top - boxRect.top,
      rects,
      text: sel.toString(),
    });
  }, [currentViewport]);

  const saveAnnotation = useCallback(
    async (color: string, kind: "highlight" | "underline", withNote: boolean) => {
      if (!selectionPopover || !book || !user) return;
      let noteText: string | null = null;
      if (withNote) {
        noteText = window.prompt("Sua nota sobre este trecho:") ?? null;
        if (noteText === null) { setSelectionPopover(null); return; }
      }
      try {
        const created = await annotationsService.create({
          book_id: book.id,
          user_id: user.id,
          page,
          text: selectionPopover.text.slice(0, 2000),
          highlight: noteText,
          color,
          kind,
          rects: selectionPopover.rects,
        });
        setAnnotations((prev) => [...prev, created]);
        toast.success(kind === "underline" ? "Sublinhado salvo" : "Destaque salvo");
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível salvar (rode a migration SQL primeiro)");
      } finally {
        window.getSelection()?.removeAllRanges();
        setSelectionPopover(null);
      }
    },
    [selectionPopover, book, user, page],
  );

  const removeAnnotation = useCallback(async (a: Annotation) => {
    try {
      await annotationsService.remove(a.id);
      setAnnotations((prev) => prev.filter((x) => x.id !== a.id));
      toast.success("Removido");
    } catch {
      toast.error("Erro ao remover");
    }
  }, []);

  // ---------------- Busca: destaca ocorrências na página atual ----------------
  useEffect(() => {
    setSearchRects([]);
    if (!searchQuery || searchQuery.length < 2 || !currentPageObj || !currentViewport) return;
    let cancelled = false;
    (async () => {
      try {
        const content = await currentPageObj.getTextContent();
        const rects: RectNorm[] = [];
        const q = searchQuery.toLowerCase();
        const vp = currentViewport;
        for (const item of content.items as Array<{
          str: string; transform: number[]; width: number; height: number;
        }>) {
          const text = (item.str ?? "").toLowerCase();
          if (!text.includes(q)) continue;
          // transform: [a,b,c,d,e,f] no espaço PDF; converter p/ viewport CSS
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tm: any = (pdfjsLib as any).Util.transform(vp.transform, item.transform);
          const fontHeight = Math.hypot(tm[2], tm[3]);
          const yTop = tm[5] - fontHeight;
          const widthCss = item.width * vp.scale;
          const charW = widthCss / Math.max(1, item.str.length);
          let idx = text.indexOf(q);
          while (idx !== -1) {
            rects.push({
              x: (tm[4] + idx * charW) / vp.width,
              y: yTop / vp.height,
              w: (q.length * charW) / vp.width,
              h: fontHeight / vp.height,
            });
            idx = text.indexOf(q, idx + q.length);
          }
        }
        if (!cancelled) setSearchRects(rects);
      } catch {
        /* noop */
      }
    })();
    return () => { cancelled = true; };
  }, [searchQuery, currentPageObj, currentViewport]);

  // ---------------- Bookmark ----------------
  async function addBookmark() {
    if (!book || !user) return;
    const { error } = await supabase.from("bookmarks").insert({
      user_id: user.id, book_id: book.id, page, chapter: `Página ${page}`,
    });
    if (error) toast.error("Erro ao criar marcador");
    else toast.success("Marcador salvo");
  }

  // ---------------- Render ----------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando leitor...
      </div>
    );
  }

  const isPdf = book?.file_path.toLowerCase().endsWith(".pdf");
  const isEpub = book?.file_path.toLowerCase().endsWith(".epub");

  async function getCurrentPageText(): Promise<string> {
    if (!pdf) return "";
    const p = await pdf.getPage(page);
    const content = await p.getTextContent();
    return content.items.map((i: { str?: string }) => i.str ?? "").join(" ");
  }

  const goToPage = (target: number) => {
    const next = clampPage(target, totalPages || target);
    setPage(next);
    // Volta ao topo da página ao navegar pelo sumário/miniaturas
    requestAnimationFrame(() => {
      pageContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const renderLeftPanel = (fullscreen: boolean) => (
    <Card className={`p-0 flex flex-col overflow-hidden ${fullscreen ? "h-full" : "max-h-[85vh]"}`}>
      <div className="grid grid-cols-2 border-b border-border/60 shrink-0">
        <button
          type="button"
          onClick={() => setLeftPanel("outline")}
          className={`text-xs py-2 font-medium transition-colors ${
            leftPanel === "outline" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40"
          }`}
        >
          Sumário
        </button>
        <button
          type="button"
          onClick={() => setLeftPanel("thumbs")}
          className={`text-xs py-2 font-medium transition-colors ${
            leftPanel === "thumbs" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40"
          }`}
        >
          Miniaturas
        </button>
      </div>
      <div className={`flex-1 min-h-0 ${leftPanel === "outline" ? "flex flex-col" : "overflow-y-auto"}`}>
        {leftPanel === "outline" ? (
          <PdfOutline pdf={pdf} totalPages={totalPages} currentPage={page} onSelect={goToPage} />
        ) : (
          <PdfThumbnails pdf={pdf} totalPages={totalPages} currentPage={page} onSelect={goToPage} />
        )}
      </div>
    </Card>
  );

  return (
    <div className="container mx-auto max-w-[1400px] px-4 py-4 space-y-3">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/biblioteca")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Biblioteca
          </Button>
          <div>
            <h1 className="text-xl font-semibold line-clamp-1">{book?.title}</h1>
            {book?.author && <p className="text-xs text-muted-foreground">{book.author}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPdf && (
            <Button variant="outline" size="sm" onClick={() => setShowThumbs((v) => !v)} className="gap-2">
              <PanelLeft className="h-4 w-4" /> {showThumbs ? "Ocultar painel" : "Sumário"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={addBookmark} className="gap-2">
            <Bookmark className="h-4 w-4" /> Marcar
          </Button>
          <Button
            variant="outline" size="sm" className="gap-2"
            onClick={async () => {
              if (!book) return;
              toast.info("Indexando PDF com IA...");
              const { data, error } = await supabase.functions.invoke("parse-pdf", {
                body: { book_id: book.id, summarize: false, max_pages: 50 },
              });
              if (error) toast.error(error.message);
              else toast.success(`${data?.pages_indexed ?? 0} páginas indexadas`);
            }}
          >
            <Sparkles className="h-4 w-4" /> Indexar
          </Button>
        </div>
      </motion.div>

      {isEpub && signedUrl ? (
        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          <EpubReader
            url={signedUrl}
            initialCfi={null}
            onLocationChange={(_cfi, pct) => {
              if (book) libraryService.update(book.id, { last_read_page: pct }).catch(console.error);
            }}
          />
          {book && user && <NotesPanel bookId={book.id} userId={user.id} currentPage={null} />}
        </div>
      ) : !isPdf ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Formato não suportado no leitor embutido.
          {signedUrl && (
            <div className="mt-4">
              <Button asChild size="sm">
                <a href={signedUrl} target="_blank" rel="noreferrer">Abrir em nova aba</a>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `${showThumbs && !isFullscreen ? "250px" : "0px"} minmax(0, 1fr) 340px`,
          }}
        >
          {/* Sumário / Miniaturas */}
          {showThumbs && !isFullscreen ? renderLeftPanel(false) : <div />}

          {/* Viewer */}
          <div ref={viewerRef} className={`min-w-0 bg-background ${isFullscreen ? "h-screen w-screen flex flex-row p-3 gap-3" : "space-y-3"}`}>
            {isFullscreen && showThumbs && (
              <div className="w-[250px] shrink-0 h-full min-h-0">{renderLeftPanel(true)}</div>
            )}
            <div className={isFullscreen ? "flex-1 min-w-0 flex flex-col gap-3 min-h-0" : "space-y-3"}>
            {/* Toolbar (flutuante e arrastável em tela cheia) */}
            <Card
              className={`p-2 flex items-center gap-2 ${
                isFullscreen
                  ? "fixed z-50 shadow-2xl bg-background/95 backdrop-blur border-border/80"
                  : "justify-between flex-wrap"
              }`}
              style={
                isFullscreen
                  ? {
                      top: 12,
                      left: "50%",
                      transform: `translate(calc(-50% + ${toolbarPos.x}px), ${toolbarPos.y}px)`,
                      touchAction: "none",
                    }
                  : undefined
              }
            >
              {isFullscreen && (
                <button
                  type="button"
                  onPointerDown={startToolbarDrag}
                  className="h-8 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                  title="Arraste para mover"
                  aria-label="Mover toolbar"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              )}
              {isFullscreen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setToolbarCollapsed((v) => !v)}
                  title={toolbarCollapsed ? "Expandir" : "Recolher"}
                >
                  {toolbarCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              )}
              {!(isFullscreen && toolbarCollapsed) && (
              <>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFitWidth(false); setFitPage(false); setZoom((z) => Math.max(0.4, z - 0.1)); }} title="Diminuir (-)">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <button
                  onClick={() => { setFitPage(false); setFitWidth(true); setZoom(1); }}
                  className="text-xs tabular-nums px-2 h-8 hover:bg-muted transition-colors"
                  title="Ajustar à largura (0)"
                >
                  {fitPage ? "Página" : fitWidth ? "Largura" : `${Math.round(zoom * 100)}%`}
                </button>
                <Button
                  variant={fitPage ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setFitWidth(false); setFitPage((v) => !v); setZoom(1); }}
                  title="Ajustar à página inteira (9)"
                >
                  <ScanLine className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFitWidth(false); setFitPage(false); setZoom((z) => Math.min(4, z + 0.1)); }} title="Aumentar (+)">
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || rendering} title="Anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs tabular-nums px-1 text-muted-foreground min-w-[60px] text-center">
                  {isPageCountLoading(totalPages) ? (
                    <span className="inline-flex items-center gap-1 justify-center">
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </span>
                  ) : (
                    <>{page} / {totalPages}</>
                  )}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))} disabled={rendering || (totalPages > 0 && page >= totalPages)} title="Próxima">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1 border-l border-border/60 pl-1 ml-1">
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => goToAnnotation(-1)}
                  disabled={!sortedAnnotations.length}
                  title="Destaque anterior (Shift+N)"
                >
                  <Highlighter className="h-4 w-4 -scale-x-100" />
                </Button>
                <span className="text-[10px] tabular-nums text-muted-foreground min-w-[32px] text-center">
                  {sortedAnnotations.length ? `${highlightNavIndex + 1}/${sortedAnnotations.length}` : "—"}
                </span>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => goToAnnotation(1)}
                  disabled={!sortedAnnotations.length}
                  title="Próximo destaque (N)"
                >
                  <Highlighter className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRotation((r) => (r + 90) % 360)} title="Girar">
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setInvertColors((v) => !v)} title="Modo noturno da página">
                  {invertColors ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button
                  variant={sepia ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSepia((v) => !v)}
                  title="Modo sépia (leitura confortável)"
                >
                  <Coffee className="h-4 w-4" />
                </Button>
                {signedUrl && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Baixar">
                    <a href={signedUrl} target="_blank" rel="noreferrer" download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setShowShortcuts((v) => !v)}
                  title="Atalhos de teclado (?)"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setShowThumbs((v) => !v)}
                  title={showThumbs ? "Ocultar sumário" : "Mostrar sumário"}
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen} title="Tela cheia (F)">
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
              </>
              )}
            </Card>

            {/* Painel de atalhos flutuante */}
            {showShortcuts && (
              <div
                className={`${isFullscreen ? "fixed" : "absolute"} z-[60] bottom-4 right-4 w-[280px] bg-background/95 backdrop-blur border border-border shadow-2xl p-3 text-xs`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Atalhos de teclado</span>
                  <button onClick={() => setShowShortcuts(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex justify-between"><span>Página anterior / próxima</span><kbd className="text-foreground">← →</kbd></li>
                  <li className="flex justify-between"><span>Início / fim</span><kbd className="text-foreground">Home / End</kbd></li>
                  <li className="flex justify-between"><span>Zoom</span><kbd className="text-foreground">+ / −</kbd></li>
                  <li className="flex justify-between"><span>Ajustar à largura</span><kbd className="text-foreground">0</kbd></li>
                  <li className="flex justify-between"><span>Ajustar à página</span><kbd className="text-foreground">9</kbd></li>
                  <li className="flex justify-between"><span>Próximo destaque</span><kbd className="text-foreground">N</kbd></li>
                  <li className="flex justify-between"><span>Destaque anterior</span><kbd className="text-foreground">Shift+N</kbd></li>
                  <li className="flex justify-between"><span>Tela cheia</span><kbd className="text-foreground">F</kbd></li>
                  <li className="flex justify-between"><span>Este painel</span><kbd className="text-foreground">?</kbd></li>
                </ul>
              </div>
            )}

            {isPdfPath && totalPages > 0 && (
              <div className="space-y-1">
                <div className="h-1 w-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((page / totalPages) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{Math.min(100, Math.round((page / totalPages) * 100))}% lido</span>
                  <span>{Math.max(0, totalPages - page)} páginas restantes</span>
                </div>
              </div>
            )}

            <div className={isFullscreen ? "flex-1 min-h-0" : ""}>
              <Card
                ref={pageContainerRef}
                className={`p-4 overflow-auto flex justify-center bg-muted/30 relative ${isFullscreen ? "h-full max-h-full" : "max-h-[80vh]"}`}
              >
                {rendering && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-background/80 backdrop-blur px-2 py-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Renderizando…
                  </div>
                )}
                <div
                  ref={pageBoxRef}
                  className="relative shadow-md"
                  style={{
                    width: currentViewport?.width ? `${currentViewport.width}px` : undefined,
                    height: currentViewport?.height ? `${currentViewport.height}px` : undefined,
                    filter: [
                      invertColors ? "invert(1) hue-rotate(180deg)" : "",
                      sepia ? "sepia(0.45) saturate(0.9) contrast(0.96) brightness(0.98)" : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined,
                    transition: "filter 200ms",
                  }}
                  onMouseUp={handleMouseUp}
                >
                  <canvas ref={canvasRef} className="block absolute inset-0" />
                  {currentPageObj && currentViewport && (
                    <PdfTextLayer page={currentPageObj} viewport={currentViewport} />
                  )}
                  {currentViewport && (
                    <>
                      <HighlightsLayer
                        annotations={pageAnnotations}
                        renderedWidth={currentViewport.width}
                        renderedHeight={currentViewport.height}
                        onClick={(a) => {
                          if (a.highlight) toast.message(a.highlight, { description: a.text ?? undefined });
                          else if (a.text) toast.message(a.text);
                        }}
                      />
                      <HighlightsLayer
                        annotations={searchAnnotations}
                        renderedWidth={currentViewport.width}
                        renderedHeight={currentViewport.height}
                      />
                    </>
                  )}
                  {selectionPopover && (
                    <SelectionPopover
                      x={selectionPopover.x}
                      y={selectionPopover.y}
                      onSave={saveAnnotation}
                      onCancel={() => {
                        window.getSelection()?.removeAllRanges();
                        setSelectionPopover(null);
                      }}
                    />
                  )}
                </div>
              </Card>
            </div>

            {/* Navegação (oculta em tela cheia — usa a da toolbar) */}
            <div className={`items-center justify-center gap-3 flex-wrap ${isFullscreen ? "hidden" : "flex"}`}>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || rendering}>
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <div className="flex items-center gap-2 text-sm">
                <PageInput
                  page={page}
                  totalPages={totalPages}
                  onCommit={setPage}
                  disabled={isPageCountLoading(totalPages)}
                  className="w-20 h-8 text-center"
                />
                <span className="text-muted-foreground">
                  {isPageCountLoading(totalPages) ? (
                    <Loader2 className="h-3 w-3 animate-spin inline" />
                  ) : (
                    <>/ {totalPages}</>
                  )}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))} disabled={rendering || (totalPages > 0 && page >= totalPages)}>
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {!isFullscreen && <PageSummarizer getPageText={getCurrentPageText} page={page} />}
            </div>
          </div>

          {/* Painel direito com abas */}
          <Card className="p-0 max-h-[85vh] flex flex-col overflow-hidden">
            <Tabs value={sidePanel} onValueChange={(v) => setSidePanel(v as typeof sidePanel)} className="flex flex-col flex-1 min-h-0">
              <TabsList className="grid grid-cols-3 m-2">
                <TabsTrigger value="notes" className="text-xs gap-1"><StickyNote className="h-3.5 w-3.5" />Notas</TabsTrigger>
                <TabsTrigger value="highlights" className="text-xs gap-1"><ListOrdered className="h-3.5 w-3.5" />Destaques</TabsTrigger>
                <TabsTrigger value="search" className="text-xs gap-1"><SearchIcon className="h-3.5 w-3.5" />Buscar</TabsTrigger>
              </TabsList>
              <TabsContent value="notes" className="flex-1 overflow-hidden m-0 p-0">
                {book && user && <NotesPanel bookId={book.id} userId={user.id} currentPage={page} />}
              </TabsContent>
              <TabsContent value="highlights" className="flex-1 overflow-y-auto m-0 p-3 space-y-2">
                {annotations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Selecione um trecho no PDF e escolha uma cor para começar.
                  </p>
                ) : (
                  annotations.map((a) => (
                    <div key={a.id} className="border p-2 text-xs space-y-1 group">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setPage(a.page)}
                          className="text-[10px] uppercase text-muted-foreground hover:text-primary"
                        >
                          Pág. {a.page} · {a.kind === "underline" ? "Sublinhado" : "Destaque"}
                        </button>
                        <div className="flex items-center gap-1">
                          <span
                            className="w-3 h-3 border border-border/60"
                            style={{ background: HIGHLIGHT_COLORS[a.color]?.bg ?? HIGHLIGHT_COLORS.yellow.bg }}
                          />
                          <button
                            onClick={() => removeAnnotation(a)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {a.text && (
                        <p className="italic text-foreground/90 line-clamp-3 leading-snug">
                          "{a.text}"
                        </p>
                      )}
                      {a.highlight && (
                        <p className="text-muted-foreground leading-snug border-l-2 border-primary/40 pl-2">
                          {a.highlight}
                        </p>
                      )}
                      <NoteInlineEditor
                        initial={a.highlight ?? ""}
                        onSave={async (v) => {
                          await annotationsService.updateNote(a.id, v);
                          setAnnotations((prev) => prev.map((x) => x.id === a.id ? { ...x, highlight: v } : x));
                        }}
                      />
                    </div>
                  ))
                )}
              </TabsContent>
              <TabsContent value="search" className="flex-1 overflow-hidden m-0 p-0">
                <PdfSearch
                  pdf={pdf}
                  totalPages={totalPages}
                  onQueryChange={setSearchQuery}
                  onJump={(p, q) => { setSearchQuery(q); setPage(p); }}
                />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      )}
    </div>
  );
}

function NoteInlineEditor({ initial, onSave }: { initial: string; onSave: (v: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setValue(initial); }}
        className="text-[10px] text-primary hover:underline"
      >
        {initial ? "Editar nota" : "+ Adicionar nota"}
      </button>
    );
  }
  return (
    <div className="space-y-1">
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={2} className="text-xs" />
      <div className="flex gap-1">
        <Button
          size="sm" className="h-6 text-[10px]" disabled={saving}
          onClick={async () => { setSaving(true); await onSave(value); setSaving(false); setOpen(false); }}
        >Salvar</Button>
        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}
