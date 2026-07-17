import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Bookmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { libraryService, type BookRow } from "@/services/libraryService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// pdfjs worker (Vite-friendly)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as pdfjsLib from "pdfjs-dist";
// @ts-expect-error - Vite worker import
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfjsLib as any).GlobalWorkerOptions.workerPort = new PdfWorker();

export default function Reader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [book, setBook] = useState<BookRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdf, setPdf] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const sessionStart = useMemo(() => new Date(), []);

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
        const viewport = p.getViewport({ scale: 1.3 });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        if (cancelled) return;
        await p.render({ canvas, canvasContext: ctx, viewport }).promise;
      } finally {
        setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, page]);

  // Persist progress with debounce
  useEffect(() => {
    if (!book) return;
    const t = setTimeout(() => {
      const status = totalPages && page >= totalPages ? "completed" : "reading";
      libraryService.update(book.id, { last_read_page: page, status }).catch(console.error);
    }, 800);
    return () => clearTimeout(t);
  }, [page, book, totalPages]);

  // Record reading session on unmount
  useEffect(() => {
    return () => {
      if (!book || !user) return;
      const end = new Date();
      const minutes = Math.max(1, Math.round((end.getTime() - sessionStart.getTime()) / 60000));
      supabase
        .from("reading_sessions")
        .insert({
          user_id: user.id,
          book_id: book.id,
          started_at: sessionStart.toISOString(),
          ended_at: end.toISOString(),
          duration_minutes: minutes,
        })
        .then(({ error }) => {
          if (error) console.error(error);
        });
    };
  }, [book, user, sessionStart]);

  async function addBookmark() {
    if (!book || !user) return;
    const { error } = await supabase.from("bookmarks").insert({
      user_id: user.id,
      book_id: book.id,
      page,
      title: `Página ${page}`,
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
        </div>
      </motion.div>

      {!isPdf ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Formato EPUB estará disponível em breve. Por enquanto, apenas PDFs são renderizados no leitor embutido.
          {signedUrl && (
            <div className="mt-4">
              <Button asChild size="sm">
                <a href={signedUrl} target="_blank" rel="noreferrer">Abrir em nova aba</a>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <>
          <Card className="p-4 overflow-auto max-h-[75vh] flex justify-center bg-muted/30">
            <canvas ref={canvasRef} className="shadow-sm rounded" />
          </Card>

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
        </>
      )}
    </div>
  );
}
