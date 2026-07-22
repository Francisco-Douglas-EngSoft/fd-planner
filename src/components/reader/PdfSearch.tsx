import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, X } from "lucide-react";

interface SearchMatch {
  page: number;
  snippet: string;
  index: number;
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any;
  totalPages: number;
  onJump: (page: number, query: string) => void;
  onQueryChange?: (q: string) => void;
}

export function PdfSearch({ pdf, totalPages, onJump, onQueryChange }: Readonly<Props>) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const cacheRef = useRef<Map<number, string>>(new Map());
  const debounceRef = useRef<number | undefined>(undefined);

  const normQ = useMemo(() => query.trim().toLowerCase(), [query]);

  useEffect(() => {
    onQueryChange?.(query.trim());
  }, [query, onQueryChange]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!pdf || !normQ || normQ.length < 2) {
      setMatches([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      const found: SearchMatch[] = [];
      try {
        for (let n = 1; n <= totalPages; n++) {
          let text = cacheRef.current.get(n);
          if (!text) {
            try {
              const p = await pdf.getPage(n);
              const c = await p.getTextContent();
              text = c.items.map((i: { str?: string }) => i.str ?? "").join(" ");
              cacheRef.current.set(n, text);
            } catch {
              text = "";
            }
          }
          const lower = text!.toLowerCase();
          let idx = lower.indexOf(normQ);
          while (idx !== -1) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(text!.length, idx + normQ.length + 30);
            found.push({
              page: n,
              snippet: text!.slice(start, end),
              index: idx,
            });
            if (found.length > 200) break;
            idx = lower.indexOf(normQ, idx + normQ.length);
          }
          if (found.length > 200) break;
          // yield ao browser periodicamente
          if (n % 8 === 0) await new Promise((r) => setTimeout(r, 0));
        }
        setMatches(found);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [normQ, pdf, totalPages]);

  const grouped = useMemo(() => {
    const map = new Map<number, SearchMatch[]>();
    for (const m of matches) {
      if (!map.has(m.page)) map.set(m.page, []);
      map.get(m.page)!.push(m);
    }
    return Array.from(map.entries());
  }, [matches]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no PDF..."
            className="pl-7 pr-7 h-8 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-2">
          {searching ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Procurando...
            </>
          ) : normQ.length >= 2 ? (
            <span>
              {matches.length} resultado(s) em {grouped.length} página(s)
            </span>
          ) : (
            <span>Digite ao menos 2 caracteres</span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border/30">
        {grouped.map(([page, list]) => (
          <div key={page} className="p-2">
            <div className="text-[11px] font-semibold text-muted-foreground mb-1">
              Página {page} · {list.length} ocorrência(s)
            </div>
            <div className="space-y-1">
              {list.slice(0, 5).map((m, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="w-full h-auto justify-start p-2 text-xs text-left whitespace-normal leading-snug"
                  onClick={() => onJump(page, normQ)}
                >
                  <HighlightSnippet text={m.snippet} q={normQ} />
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HighlightSnippet({ text, q }: { text: string; q: string }) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      …{text.slice(0, idx)}
      <mark className="bg-primary/30 text-foreground px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}…
    </span>
  );
}
