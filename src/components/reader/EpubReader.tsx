import { useEffect, useRef, useState } from "react";
import ePub, { type Rendition } from "epubjs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface Props {
  url: string;
  initialCfi?: string | null;
  onLocationChange?: (cfi: string, percentage: number) => void;
}

export function EpubReader({ url, initialCfi, onLocationChange }: Readonly<Props>) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [loading, setLoading] = useState(true);

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

    rendition.on("relocated", (loc: { start: { cfi: string; percentage: number } }) => {
      onLocationChange?.(loc.start.cfi, Math.round((loc.start.percentage ?? 0) * 100));
    });

    return () => {
      rendition.destroy();
      book.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div className="relative w-full h-[75vh] bg-background rounded-lg border overflow-hidden">
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
  );
}