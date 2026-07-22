import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any;
  totalPages: number;
  currentPage: number;
  onSelect: (page: number) => void;
}

function ThumbItem({
  pdf,
  page,
  active,
  onSelect,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any;
  page: number;
  active: boolean;
  onSelect: (p: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLButtonElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!pdf || !containerRef.current) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || rendered) return;
        try {
          const p = await pdf.getPage(page);
          const base = p.getViewport({ scale: 1 });
          const targetW = 140;
          const scale = targetW / base.width;
          const vp = p.getViewport({ scale });
          const canvas = canvasRef.current;
          if (!canvas || cancelled) return;
          canvas.width = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext("2d")!;
          await p.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
          if (!cancelled) setRendered(true);
        } catch {
          /* noop */
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(containerRef.current);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [pdf, page, rendered]);

  // Scroll into view when active
  useEffect(() => {
    if (active && containerRef.current) {
      containerRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [active]);

  return (
    <button
      ref={containerRef}
      type="button"
      onClick={() => onSelect(page)}
      className={`group flex flex-col items-center gap-1 p-2 w-full transition-colors ${
        active ? "bg-primary/15 ring-1 ring-primary/60" : "hover:bg-muted/40"
      }`}
    >
      <div className="relative w-[140px] min-h-[180px] bg-muted flex items-center justify-center shadow-sm">
        {!rendered && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <canvas ref={canvasRef} className={rendered ? "block" : "hidden"} />
      </div>
      <span
        className={`text-[11px] tabular-nums ${
          active ? "font-semibold text-primary" : "text-muted-foreground"
        }`}
      >
        {page}
      </span>
    </button>
  );
}

export function PdfThumbnails({ pdf, totalPages, currentPage, onSelect }: Readonly<Props>) {
  if (!pdf || !totalPages) {
    return (
      <div className="p-4 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando miniaturas...
      </div>
    );
  }
  return (
    <div className="flex flex-col divide-y divide-border/40">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <ThumbItem key={n} pdf={pdf} page={n} active={n === currentPage} onSelect={onSelect} />
      ))}
    </div>
  );
}
