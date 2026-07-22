import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Bookmark, Loader2, Sparkles,
  ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCw, Download, Moon, Sun,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { libraryService, type BookRow } from "@/services/libraryService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EpubReader } from "@/components/reader/EpubReader";
import { NotesPanel } from "@/components/reader/NotesPanel";
import { PageSummarizer } from "@/components/reader/PageSummarizer";

// pdfjs worker (Vite-friendly)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfjsLib as any).GlobalWorkerOptions.workerPort = new PdfWorker();

export default function Reader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const [book, setBook] = useState<BookRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdf, setPdf] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const sessionStart = useMemo(() => new Date(), []);
  const [epubCfi, setEpubCfi] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1); // 1 = fit width
  const [fitWidth, setFitWidth] = useState(true);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [invertColors, setInvertColors] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const b = await libraryService.get(id);
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

  useEffect(() => {
    if (!signedUrl || !book) return;
    if (!book.file_path.toLowerCase().endsWith(".pdf")) return;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = await (pdfjsLib as any).getDocument({ url: signedUrl }).promise;
        setPdf(doc);
        setTotalPages(doc.numPages);
        if (!book.total_pages || book.total_pages !== doc.numPages) {
          await libraryService.update(book.id, { total_pages: doc.numPages });
        }
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível abrir o PDF");
      }
    })();
  }, [signedUrl, book]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        setRendering(true);
        const p = await pdf.getPage(page);
        // Base viewport at scale 1 to compute fit-width scale
        const base = p.getViewport({ scale: 1, rotation });
        const containerWidth = pageContainerRef.current?.clientWidth ?? 800;
        const availableWidth = Math.max(320, containerWidth - 32);
        const fitScale = availableWidth / base.width;
        const effectiveScale = (fitWidth ? fitScale : 1) * zoom;
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
      } finally {
        setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, page, zoom, fitWidth, rotation]);

  // Re-render on resize when fitting width
  useEffect(() => {
    if (!fitWidth) return;
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
  }, [fitWidth]);

  // Keyboard navigation
  const isPdfPath = book?.file_path.toLowerCase().endsWith(".pdf");
  useEffect(() => {
    if (!isPdfPath) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setPage((p) => Math.max(1, p - 1));
      } else if (e.key === "Home") setPage(1);
      else if (e.key === "End" && totalPages) setPage(totalPages);
      else if (e.key === "+" || e.key === "=") { setFitWidth(false); setZoom((z) => Math.min(4, z + 0.1)); }
      else if (e.key === "-") { setFitWidth(false); setZoom((z) => Math.max(0.4, z - 0.1)); }
      else if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPdfPath, totalPages]);

  const toggleFullscreen = useCallback(async () => {
    const el = viewerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Persist progress with debounce
  useEffect(() => {
    if (!book) return;
    const t = setTimeout(() => {
      const status = totalPages && page >= totalPages ? "completed" : "reading";
      libraryService.update(book.id, { last_read_page: page, status }).catch(console.error);
    }, 800);
    return () => clearTimeout(t);
  }, [page, book, totalPages]);

  // Record reading session on unmount + integra com Foco/XP
  // (grava também uma focus_session do tipo "work" para alimentar horas/XP/conquistas)
  useEffect(() => {
    return () => {
      if (!book || !user) return;
      const end = new Date();
      const minutes = Math.max(1, Math.round((end.getTime() - sessionStart.getTime()) / 60000));
      // Ignora leituras muito curtas (< 1 min efetivo)
      if (minutes < 1) return;
      const today = end.toISOString().slice(0, 10);
      supabase
        .from("reading_sessions")
        .insert({
          user_id: user.id,
          book_id: book.id,
          date: today,
          duration_minutes: minutes,
        })
        .then(({ error }) => error && console.error(error));
      // Reading conta como foco: alimenta horas, streaks, XP e conquistas.
      supabase
        .from("focus_sessions")
        .insert({
          user_id: user.id,
          duration_minutes: minutes,
          session_type: "work",
          notes: `Leitura: ${book.title}`,
        })
        .then(({ error }) => error && console.error(error));
    };
  }, [book, user, sessionStart]);

  async function addBookmark() {
    if (!book || !user) return;
    const { error } = await supabase.from("bookmarks").insert({
      user_id: user.id,
      book_id: book.id,
      page,
      chapter: `Página ${page}`,
    });
    if (error) {
      console.error(error);
      toast.error("Erro ao criar marcador");
    } else {
      toast.success("Marcador salvo");
    }
  }

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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 space-y-4">
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
          <Button variant="outline" size="sm" onClick={addBookmark} className="gap-2">
            <Bookmark className="h-4 w-4" /> Marcar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={async () => {
              if (!book) return;
              toast.info("Indexando PDF com IA... isso pode levar alguns instantes");
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
            onLocationChange={(cfi, pct) => {
              setEpubCfi(cfi);
              if (book) libraryService.update(book.id, { last_read_page: pct }).catch(console.error);
            }}
          />
          {book && user && (
            <NotesPanel bookId={book.id} userId={user.id} currentPage={null} />
          )}
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
        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          <div className="space-y-3">
            {/* PDF Toolbar */}
            <Card className="p-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFitWidth(false); setZoom((z) => Math.max(0.4, z - 0.1)); }} title="Diminuir (-)">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <button
                  onClick={() => { setFitWidth(true); setZoom(1); }}
                  className="text-xs tabular-nums px-2 h-8 hover:bg-muted transition-colors"
                  title="Ajustar à largura"
                >
                  {fitWidth ? "Ajuste" : `${Math.round(zoom * 100)}%`}
                </button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFitWidth(false); setZoom((z) => Math.min(4, z + 0.1)); }} title="Aumentar (+)">
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRotation((r) => (r + 90) % 360)} title="Girar">
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setInvertColors((v) => !v)} title="Modo noturno da página">
                  {invertColors ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                {signedUrl && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Baixar">
                    <a href={signedUrl} target="_blank" rel="noreferrer" download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen} title="Tela cheia (F)">
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </Card>

            <div ref={viewerRef} className="bg-background">
              <Card
                ref={pageContainerRef}
                className={`p-4 overflow-auto flex justify-center bg-muted/30 relative ${isFullscreen ? "max-h-screen h-screen" : "max-h-[80vh]"}`}
              >
                {rendering && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-background/80 backdrop-blur px-2 py-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Renderizando…
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="shadow-md"
                  style={{
                    filter: invertColors ? "invert(1) hue-rotate(180deg)" : undefined,
                    transition: "filter 200ms",
                  }}
                />
              </Card>
            </div>
            <PageSummarizer getPageText={getCurrentPageText} page={page} />
          </div>
          {book && user && (
            <NotesPanel bookId={book.id} userId={user.id} currentPage={page} />
          )}
        </div>
      )}

      {isPdf && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || rendering}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <Input
                type="number"
                min={1}
                max={totalPages || undefined}
                value={page}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n) && n >= 1 && (!totalPages || n <= totalPages)) setPage(n);
                }}
                className="w-20 h-8 text-center"
              />
              <span className="text-muted-foreground">/ {totalPages || "..."}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))}
              disabled={rendering || (totalPages > 0 && page >= totalPages)}
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
      )}
    </div>
  );
}
