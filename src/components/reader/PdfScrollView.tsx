/**
 * Leitura em rolagem contínua: todas as páginas numa coluna.
 * Só desenha as páginas perto da área visível (economiza memória em livros grandes).
 */
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { HighlightsLayer } from "./HighlightsLayer";
import type { Annotation } from "@/services/annotationsService";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  pdf: any;
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  zoom: number;
  fitWidth: boolean;
  rotation: number;
  filter?: string;
  annotations: Annotation[];
  className?: string;
}

interface Size {
  w: number;
  h: number;
}

export function PdfScrollView({
  pdf, totalPages, page, onPageChange, zoom, fitWidth, rotation, filter, annotations, className,
}: Readonly<Props>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [width, setWidth] = useState(0);
  const [baseSize, setBaseSize] = useState<Size | null>(null);
  const reportedRef = useRef(page);
  const initialScrollDone = useRef(false);

  // Tamanho de referência (página 1) para reservar espaço das demais.
  useEffect(() => {
    let alive = true;
    pdf.getPage(1).then((p: any) => {
      const v = p.getViewport({ scale: 1, rotation });
      if (alive) setBaseSize({ w: v.width, h: v.height });
    });
    return () => {
      alive = false;
    };
  }, [pdf, rotation]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const scale = baseSize && width ? (fitWidth ? Math.max(0.2, (width - 24) / baseSize.w) : 1) * zoom : 0;

  // Vai para a página inicial / páginas pedidas pela barra (sem loop com o scroll).
  useLayoutEffect(() => {
    if (!scale) return;
    if (initialScrollDone.current && page === reportedRef.current) return;
    const slot = slotRefs.current[page - 1];
    const el = scrollRef.current;
    if (slot && el) {
      el.scrollTop = slot.offsetTop - 8;
      reportedRef.current = page;
      initialScrollDone.current = true;
    }
  }, [page, scale]);

  // Página atual = a que cruza 35% da altura visível.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const line = el.scrollTop + el.clientHeight * 0.35;
        let current = 1;
        for (let i = 0; i < slotRefs.current.length; i++) {
          const s = slotRefs.current[i];
          if (s && s.offsetTop <= line) current = i + 1;
          else break;
        }
        if (current !== reportedRef.current) {
          reportedRef.current = current;
          onPageChange(current);
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [onPageChange]);

  return (
    <div ref={scrollRef} className={className} style={{ overflowY: "auto" }}>
      {!scale ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <PageSlot
              key={i}
              slotRef={(el) => {
                slotRefs.current[i] = el;
              }}
              pdf={pdf}
              pageNumber={i + 1}
              scale={scale}
              rotation={rotation}
              estimate={{ w: baseSize!.w * scale, h: baseSize!.h * scale }}
              root={scrollRef}
              filter={filter}
              annotations={annotations}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SlotProps {
  pdf: any;
  pageNumber: number;
  scale: number;
  rotation: number;
  estimate: Size;
  root: React.RefObject<HTMLDivElement>;
  filter?: string;
  annotations: Annotation[];
  slotRef: (el: HTMLDivElement | null) => void;
}

const PageSlot = memo(function PageSlot({
  pdf, pageNumber, scale, rotation, estimate, root, filter, annotations, slotRef,
}: SlotProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const [size, setSize] = useState<Size | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      root: root.current,
      rootMargin: "1200px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    if (!near) {
      // Libera a memória das páginas longe da tela.
      const c = canvasRef.current;
      if (c) {
        c.width = 0;
        c.height = 0;
      }
      setDrawn(false);
      return;
    }
    let cancelled = false;
    let task: any = null;
    (async () => {
      const p = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const cssViewport = p.getViewport({ scale, rotation });
      setSize({ w: cssViewport.width, h: cssViewport.height });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = p.getViewport({ scale: scale * dpr, rotation });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      task = p.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport });
      try {
        await task.promise;
        if (!cancelled) setDrawn(true);
      } catch {
        /* cancelado */
      }
    })();
    return () => {
      cancelled = true;
      try {
        task?.cancel?.();
      } catch {
        /* noop */
      }
    };
  }, [near, pdf, pageNumber, scale, rotation]);

  const w = size?.w ?? estimate.w;
  const h = size?.h ?? estimate.h;
  const pageAnnotations = annotations.filter((a) => a.page === pageNumber);

  return (
    <div
      ref={(el) => {
        boxRef.current = el;
        slotRef(el);
      }}
      data-page={pageNumber}
      className="relative shadow-md bg-card shrink-0"
      style={{ width: w, height: h, filter, transition: "filter 200ms" }}
    >
      <canvas ref={canvasRef} className="block absolute inset-0 h-full w-full" />
      {!drawn && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {pageNumber}
        </div>
      )}
      {drawn && pageAnnotations.length > 0 && (
        <HighlightsLayer annotations={pageAnnotations} renderedWidth={w} renderedHeight={h} />
      )}
    </div>
  );
});
