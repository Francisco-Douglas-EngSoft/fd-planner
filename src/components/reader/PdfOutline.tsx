import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Loader2, ListTree } from "lucide-react";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolvePage(pdf: any, item: any): Promise<number | null> {
  try {
    let dest = item.dest;
    if (typeof dest === "string") dest = await pdf.getDestination(dest);
    if (!Array.isArray(dest) || !dest[0]) return null;
    const ref = dest[0];
    const index = typeof ref === "object" ? await pdf.getPageIndex(ref) : Number(ref);
    return Number.isFinite(index) ? index + 1 : null;
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
    const children = it.items?.length ? await buildTree(pdf, it.items, level + 1, id) : [];
    out.push({ id, title: (it.title || "Sem título").trim(), page, level, children });
  }
  return out;
}

function flatten(nodes: OutlineNode[], expanded: Record<string, boolean>): OutlineNode[] {
  const res: OutlineNode[] = [];
  for (const n of nodes) {
    res.push(n);
    if (n.children.length && expanded[n.id] !== false) res.push(...flatten(n.children, expanded));
  }
  return res;
}

export function PdfOutline({ pdf, currentPage, onSelect }: Readonly<Props>) {
  const [nodes, setNodes] = useState<OutlineNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    if (!pdf) return;
    setLoading(true);
    (async () => {
      try {
        const raw = await pdf.getOutline();
        if (cancelled) return;
        if (!raw || raw.length === 0) {
          setNodes([]);
        } else {
          const tree = await buildTree(pdf, raw);
          if (!cancelled) setNodes(tree);
        }
      } catch {
        if (!cancelled) setNodes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf]);

  const visible = useMemo(() => (nodes ? flatten(nodes, expanded) : []), [nodes, expanded]);

  // Item ativo = último item cuja página <= página atual
  const activeId = useMemo(() => {
    if (!nodes) return null;
    const all = flatten(nodes, {});
    let best: OutlineNode | null = null;
    for (const n of all) {
      if (n.page && n.page <= currentPage && (!best || (best.page ?? 0) <= n.page)) best = n;
    }
    return best?.id ?? null;
  }, [nodes, currentPage]);

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
      </div>
    );
  }

  return (
    <div className="flex flex-col py-1">
      {visible.map((n) => {
        const hasChildren = n.children.length > 0;
        const isOpen = expanded[n.id] !== false;
        const active = n.id === activeId;
        return (
          <div key={n.id} className="flex items-stretch">
            {hasChildren ? (
              <button
                type="button"
                aria-label={isOpen ? "Recolher" : "Expandir"}
                onClick={() => setExpanded((e) => ({ ...e, [n.id]: !isOpen }))}
                className="px-1 text-muted-foreground hover:text-foreground shrink-0"
                style={{ marginLeft: n.level * 10 }}
              >
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>
            ) : (
              <span className="shrink-0" style={{ width: 22, marginLeft: n.level * 10 }} />
            )}
            <button
              type="button"
              disabled={!n.page}
              onClick={() => n.page && onSelect(n.page)}
              title={n.title}
              className={`flex-1 min-w-0 text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                active ? "bg-primary/15 text-primary font-medium" : "hover:bg-muted/50"
              } ${!n.page ? "opacity-50 cursor-default" : ""}`}
            >
              <span className="truncate flex-1">{n.title}</span>
              {n.page && <span className="tabular-nums text-[10px] text-muted-foreground">{n.page}</span>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
