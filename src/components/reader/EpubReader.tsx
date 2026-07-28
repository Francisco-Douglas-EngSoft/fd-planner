import { useEffect, useRef, useState } from "react";
import ePub, { type Rendition } from "epubjs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, ListTree } from "lucide-react";

interface Props {
  url: string;
  initialCfi?: string | null;
  onLocationChange?: (cfi: string, percentage: number) => void;
}

interface TocEntry {
  href: string;
  label: string;
  level: number;
}

export function EpubReader({ url, initialCfi, onLocationChange }: Readonly<Props>) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [showToc, setShowToc] = useState(true);
  const [activeHref, setActiveHref] = useState<string | null>(null);

  useEffect(() => {
    if (!viewerRef.current) return;
    const book = ePub(url);
    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      spread: "auto",
    });
    renditionRef.current = rendition;

    rendition.display(initialCfi ?? undefined).then(() => setLoading(false));

    book.loaded.navigation
      .then((nav) => {
        const flat: TocEntry[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const walk = (items: any[], level: number) => {
          for (const it of items ?? []) {
            flat.push({ href: it.href, label: (it.label || "").trim() || "Sem título", level });
            if (it.subitems?.length) walk(it.subitems, level + 1);
          }
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        walk(nav.toc as unknown as any[], 0);
        setToc(flat);
      })
      .catch(() => setToc([]));

    rendition.on("relocated", (loc: { start: { cfi: string; percentage: number; href?: string } }) => {
      onLocationChange?.(loc.start.cfi, Math.round((loc.start.percentage ?? 0) * 100));
      if (loc.start.href) setActiveHref(loc.start.href);
    });

    return () => {
      rendition.destroy();
      book.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const hasToc = toc.length > 0;

  return (
    <div className="flex w-full h-[75vh] bg-background border overflow-hidden">
      {hasToc && showToc && (
        <aside className="w-[230px] shrink-0 border-r border-border/60 flex flex-col">
          <div className="px-3 py-2 text-xs font-medium border-b border-border/60 flex items-center gap-2">
            <ListTree className="h-3.5 w-3.5" /> Sumário
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {toc.map((t, i) => {
              const base = activeHref?.split("#")[0] ?? "";
              const active = !!base && t.href.includes(base);
              return (
                <button
                  key={`${t.href}-${i}`}
                  type="button"
                  title={t.label}
                  onClick={() => renditionRef.current?.display(t.href)}
                  style={{ paddingLeft: 10 + t.level * 12 }}
                  className={`w-full text-left pr-2 py-1.5 text-xs truncate transition-colors ${
                    active ? "bg-primary/15 text-primary font-medium" : "hover:bg-muted/50"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </aside>
      )}

      <div className="relative flex-1 min-w-0">
        {hasToc && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowToc((v) => !v)}
            className="absolute top-2 left-2 z-20 h-7 gap-1 text-xs"
          >
            <ListTree className="h-3.5 w-3.5" /> {showToc ? "Ocultar" : "Sumário"}
          </Button>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <div ref={viewerRef} className="w-full h-full" />
        <div className="absolute inset-y-0 left-0 flex items-center">
          <Button variant="ghost" size="icon" onClick={() => renditionRef.current?.prev()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center">
          <Button variant="ghost" size="icon" onClick={() => renditionRef.current?.next()}>
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
