import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Loader2, ListTree, Search, X, ChevronsDownUp, ChevronsUpDown } from "lucide-react";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any;
  totalPages?: number;
  currentPage: number;
  onSelect: (page: number) => void;
}

export interface OutlineNode {
  id: string;
  title: string;
  page: number | null;
  level: number;
  children: OutlineNode[];
}

/** Resolve o destino de um item de sumário para um número de página (1-based). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolvePage(pdf: any, item: any): Promise<number | null> {
  try {
    let dest = item?.dest;
    if (typeof dest === "string") dest = await pdf.getDestination(dest);
    if (!dest && item?.action === "GoToPage" && Number.isFinite(item?.pageNumber)) {
      return item.pageNumber;
    }
    if (!Array.isArray(dest) || dest.length === 0) return null;

    const ref = dest[0];
    // Referência direta a um número de página (destino explícito numérico)
    if (typeof ref === "number" && Number.isFinite(ref)) return ref + 1;
    if (ref && typeof ref === "object") {
      const index = await pdf.getPageIndex(ref);
      if (Number.isFinite(index)) return index + 1;
    }
    return null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildTree(pdf: any, items: any[], level = 0, prefix = "o"): Promise<OutlineNode[]> {
  const out: OutlineNode[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const id = `${prefix}-${i}`;
    const page = await resolvePage(pdf, it);
    const children = it?.items?.length ? await buildTree(pdf, it.items, level + 1, id) : [];
    out.push({
      id,
      title: (it?.title || "").replace(/\s+/g, " ").trim() || "Sem título",
      // Capítulo sem destino próprio herda a página do primeiro filho válido
      page: page ?? children.find((c) => c.page)?.page ?? null,
      level,
      children,
    });
  }
  return out;
}

/** Garante páginas monotônicas e dentro do intervalo válido do documento. */
function normalize(nodes: OutlineNode[], total: number): OutlineNode[] {
  const all: OutlineNode[] = [];
  const walk = (list: OutlineNode[]) => list.forEach((n) => { all.push(n); walk(n.children); });
  walk(nodes);
  for (const n of all) {
    if (n.page == null) continue;
    if (!Number.isFinite(n.page) || n.page < 1) n.page = 1;
    if (total > 0 && n.page > total) n.page = total;
  }
  return nodes;
}

function flatten(nodes: OutlineNode[], expanded: Record<string, boolean>): OutlineNode[] {
  const res: OutlineNode[] = [];
  for (const n of nodes) {
    res.push(n);
    if (n.children.length && expanded[n.id] !== false) res.push(...flatten(n.children, expanded));
  }
  return res;
}

function flattenAll(nodes: OutlineNode[]): OutlineNode[] {
  const res: OutlineNode[] = [];
  for (const n of nodes) {
    res.push(n);
    if (n.children.length) res.push(...flattenAll(n.children));
  }
  return res;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function PdfOutline({ pdf, totalPages = 0, currentPage, onSelect }: Readonly<Props>) {
  const [nodes, setNodes] = useState<OutlineNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!pdf) return;
    setLoading(true);
    setNodes(null);
    setQuery("");
    setExpanded({});
    (async () => {
      try {
        const raw = await pdf.getOutline();
        if (cancelled) return;
        if (!raw || raw.length === 0) {
          setNodes([]);
        } else {
          const tree = normalize(await buildTree(pdf, raw), pdf.numPages ?? totalPages);
          if (!cancelled) setNodes(tree);
        }
      } catch {
        if (!cancelled) setNodes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf]);

  const all = useMemo(() => (nodes ? flattenAll(nodes) : []), [nodes]);

  /** Item ativo: o último item cuja página inicial <= página atual. */
  const activeId = useMemo(() => {
    let best: OutlineNode | null = null;
    for (const n of all) {
      if (n.page == null || n.page > currentPage) continue;
      if (!best || n.page > (best.page ?? 0) || (n.page === best.page && n.level > best.level)) best = n;
    }
    return best?.id ?? null;
  }, [all, currentPage]);

  // Abre automaticamente os ancestrais do item ativo
  useEffect(() => {
    if (!nodes || !activeId) return;
    const path: string[] = [];
    const find = (list: OutlineNode[], trail: string[]): boolean => {
      for (const n of list) {
        if (n.id === activeId) { path.push(...trail); return true; }
        if (n.children.length && find(n.children, [...trail, n.id])) return true;
      }
      return false;
    };
    find(nodes, []);
    if (path.length) {
      setExpanded((e) => {
        const next = { ...e };
        let changed = false;
        for (const id of path) if (next[id] === false) { next[id] = true; changed = true; }
        return changed ? next : e;
      });
    }
  }, [activeId, nodes]);

  // Mantém o item ativo visível na lista
  useEffect(() => {
    if (!activeId || query) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-node="${activeId}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeId, query]);

  const visible = useMemo(() => {
    if (!nodes) return [];
    if (!query.trim()) return flatten(nodes, expanded);
    const q = norm(query.trim());
    return all.filter((n) => norm(n.title).includes(q));
  }, [nodes, all, expanded, query]);

  const anyCollapsed = useMemo(
    () => all.some((n) => n.children.length && expanded[n.id] === false),
    [all, expanded]
  );

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    for (const n of all) if (n.children.length) next[n.id] = anyCollapsed;
    setExpanded(next);
  };

  const go = (n: OutlineNode) => {
    if (n.page == null) return;
    onSelect(totalPages > 0 ? Math.min(Math.max(1, n.page), totalPages) : n.page);
  };

  if (loading) {
    return (
      <div className="p-4 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando sumário...
      </div>
    );
  }

  if (!nodes || nodes.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground flex flex-col items-center gap-2 text-center">
        <ListTree className="h-5 w-5 opacity-60" />
        Este livro não possui sumário incorporado.
        <span className="opacity-70">Use as miniaturas para navegar.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-2 border-b border-border/50 shrink-0 flex items-center gap-1">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar capítulo..."
            className="w-full h-7 pl-7 pr-6 text-xs bg-muted/40 border border-border/60 outline-none focus:border-primary/60"
          />
          {query && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={toggleAll}
          title={anyCollapsed ? "Expandir tudo" : "Recolher tudo"}
          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          {anyCollapsed ? <ChevronsUpDown className="h-3.5 w-3.5" /> : <ChevronsDownUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto py-1">
        {visible.length === 0 && (
          <p className="p-4 text-xs text-muted-foreground text-center">Nenhum capítulo encontrado.</p>
        )}
        {visible.map((n) => {
          const hasChildren = n.children.length > 0 && !query;
          const isOpen = expanded[n.id] !== false;
          const active = n.id === activeId;
          const indent = query ? 0 : n.level * 10;
          return (
            <div key={n.id} data-node={n.id} className="flex items-stretch">
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={isOpen ? "Recolher" : "Expandir"}
                  onClick={() => setExpanded((e) => ({ ...e, [n.id]: !isOpen }))}
                  className="px-1 text-muted-foreground hover:text-foreground shrink-0"
                  style={{ marginLeft: indent }}
                >
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
              ) : (
                <span className="shrink-0" style={{ width: 22, marginLeft: indent }} />
              )}
              <button
                type="button"
                disabled={n.page == null}
                onClick={() => go(n)}
                title={n.page ? `${n.title} — pág. ${n.page}` : n.title}
                className={`flex-1 min-w-0 text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  active ? "bg-primary/15 text-primary font-medium border-l-2 border-primary" : "hover:bg-muted/50 border-l-2 border-transparent"
                } ${n.page == null ? "opacity-50 cursor-default" : ""}`}
              >
                <span className="truncate flex-1">{n.title}</span>
                {n.page != null && (
                  <span className="tabular-nums text-[10px] text-muted-foreground shrink-0">{n.page}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
