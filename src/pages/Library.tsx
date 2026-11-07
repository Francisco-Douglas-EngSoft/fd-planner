import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Upload, Trash2, Search, Loader2, RefreshCw,
  Library as LibraryIcon, FolderOpen, Pencil, LayoutGrid, List as ListIcon,
  CheckCircle2, Clock, Layers, HardDrive, Info, Filter, X,
  CheckSquare2, Square,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBooks } from "@/hooks/useBooks";
import { libraryService, type BookRow } from "@/services/libraryService";
import { collectionsService } from "@/services/collectionsService";
import { extractPdfMetadata } from "@/lib/pdfMetadata";
import { BookCover } from "@/components/library/BookCover";
import { BookEditDialog, BOOK_STATUSES } from "@/components/library/BookEditDialog";
import { BookUploadDialog } from "@/components/library/BookUploadDialog";
import { BookDetailDialog } from "@/components/library/BookDetailDialog";
import { CollectionsPanel } from "@/components/library/CollectionsPanel";
import { BatchActionsBar } from "@/components/library/BatchActionsBar";
import { StorageManager } from "@/components/library/StorageManager";
import { LibraryReports } from "@/components/library/LibraryReports";
import { ReadingPlanAI } from "@/components/library/ReadingPlanAI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/QueryState";
import { useCollections } from "@/hooks/useCollections";

const UNCATEGORIZED = "__uncategorized__";
const BOOKS_PAGE_SIZE = 24;

function inferFileType(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "epub") return "epub";
  return ext || "file";
}

function statusLabel(status?: string | null) {
  return BOOK_STATUSES.find((s) => s.value === status)?.label ?? "Para ler";
}

type SortKey = "recent" | "title" | "author" | "progress";
type StatusFilter = "all" | "to-read" | "reading" | "completed" | "abandoned";

export default function Library() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: books = [], isLoading, isError, error, refetch, create, update, remove } = useBooks();
  const { data: collections = [], addBook: addToCollection } = useCollections();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [fileTypeFilter, setFileTypeFilter] = useState<"all" | "pdf" | "epub">("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editing, setEditing] = useState<BookRow | null>(null);
  const [detailBook, setDetailBook] = useState<BookRow | null>(null);

  // Ações em lote
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchCollectionId, setBatchCollectionId] = useState<string>("");
  const [collectionBookIds, setCollectionBookIds] = useState<string[]>([]);

  // Livros da coleção ativa
  useEffect(() => {
    if (!activeCollection) { setCollectionBookIds([]); return; }
    collectionsService.getCollectionBooks(activeCollection).then(setCollectionBookIds).catch(() => {});
  }, [activeCollection]);

  useEffect(() => { setPage(1); }, [query, activeCategory, activeCollection, statusFilter, fileTypeFilter, sort]);
  useEffect(() => { setSelected(new Set()); }, [activeCategory, activeCollection, statusFilter]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    let none = 0;
    for (const b of books) {
      const c = (b.category ?? "").trim();
      if (!c) none++;
      else map.set(c, (map.get(c) ?? 0) + 1);
    }
    const list = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return { list, none };
  }, [books]);

  const categoryNames = useMemo(() => categories.list.map((c) => c.name), [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = books.filter((b) => {
      const cat = (b.category ?? "").trim();
      const fileType = inferFileType(b.file_path);

      if (activeCollection && !collectionBookIds.includes(b.id)) return false;
      if (activeCategory === UNCATEGORIZED && cat) return false;
      if (activeCategory !== "all" && activeCategory !== UNCATEGORIZED && cat !== activeCategory) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (fileTypeFilter !== "all" && fileType !== fileTypeFilter) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        (b.author ?? "").toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q) ||
        ((b as BookRow & { isbn?: string }).isbn ?? "").toLowerCase().includes(q)
      );
    });

    const progressOf = (b: BookRow) => {
      if (b.file_path.toLowerCase().endsWith(".epub")) {
        return (b as BookRow & { last_read_pct?: number }).last_read_pct ?? 0;
      }
      return b.total_pages ? ((b.last_read_page ?? 0) / b.total_pages) * 100 : 0;
    };

    list = [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "pt-BR");
      if (sort === "author") return (a.author ?? "").localeCompare(b.author ?? "", "pt-BR");
      if (sort === "progress") return progressOf(b) - progressOf(a);
      return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
    });
    return list;
  }, [books, query, activeCategory, activeCollection, collectionBookIds, statusFilter, fileTypeFilter, sort]);

  const reading = filtered.filter((b) => b.status === "reading" || ((b.last_read_page ?? 0) > 0 && b.status !== "completed"));
  const completed = filtered.filter((b) => b.status === "completed");
  // "Continuar lendo": livros em andamento ordenados por data de atualização
  const continueLast = useMemo(() =>
    [...books]
      .filter((b) => b.status === "reading" || (b.last_read_page ?? 0) > 0)
      .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
      .slice(0, 4),
    [books]
  );

  const stats = useMemo(() => {
    const totalPages = books.reduce((s, b) => s + (b.total_pages ?? 0), 0);
    const readPages = books.reduce((s, b) => s + Math.min(b.last_read_page ?? 0, b.total_pages ?? 0), 0);
    return {
      total: books.length,
      completed: books.filter((b) => b.status === "completed").length,
      reading: books.filter((b) => b.status === "reading" || ((b.last_read_page ?? 0) > 0 && b.status !== "completed")).length,
      categories: categories.list.length,
      pagesPct: totalPages ? Math.round((readPages / totalPages) * 100) : 0,
    };
  }, [books, categories]);

  async function handleRemove(id: string) {
    if (!confirm("Remover este livro da biblioteca? Esta ação é irreversível.")) return;
    try {
      await remove.mutateAsync(id);
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast.success("Livro removido");
    } catch {
      toast.error("Erro ao remover");
    }
  }

  async function handleBatchDelete() {
    if (!selected.size) return;
    if (!confirm(`Remover ${selected.size} livro(s)? Esta ação é irreversível.`)) return;
    setBatchDeleting(true);
    let ok = 0;
    for (const id of selected) {
      try { await remove.mutateAsync(id); ok++; } catch { /* continue */ }
    }
    setSelected(new Set());
    setBatchDeleting(false);
    toast.success(`${ok} livro(s) removido(s)`);
  }

  async function handleBatchAddToCollection() {
    if (!batchCollectionId || !selected.size) return;
    let ok = 0;
    for (const bookId of selected) {
      try {
        await addToCollection.mutateAsync({ bookId, collectionId: batchCollectionId });
        ok++;
      } catch { /* continue */ }
    }
    toast.success(`${ok} livro(s) adicionado(s) à coleção`);
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((b) => b.id)));
  }

  async function syncMissingCovers() {
    if (!user) return;
    const targets = books.filter(
      (b) => (!b.cover_path || !b.total_pages) && b.file_path.toLowerCase().endsWith(".pdf"),
    );
    if (targets.length === 0) { toast.info("Todos os PDFs já possuem capa e paginação."); return; }
    setSyncing(true);
    let ok = 0, fail = 0;
    for (const b of targets) {
      try {
        const signed = await libraryService.getSignedUrl(b.file_path, 300);
        const res = await fetch(signed);
        const buf = await res.arrayBuffer();
        const meta = await extractPdfMetadata(buf);
        let coverPath = b.cover_path ?? null;
        if (!coverPath && meta.coverBlob) coverPath = await libraryService.uploadCover(user.id, meta.coverBlob);
        await update.mutateAsync({
          id: b.id,
          patch: { cover_path: coverPath, total_pages: b.total_pages || meta.totalPages, author: b.author || meta.author },
        });
        ok++;
      } catch {
        fail++;
      }
    }
    setSyncing(false);
    toast.success(`Capas sincronizadas: ${ok} · falhas: ${fail}`);
  }

  const gridProps = {
    view,
    selected,
    onToggleSelect: toggleSelect,
    onOpen: (id: string) => navigate(`/leitor/${id}`),
    onDetail: (b: BookRow) => setDetailBook(b),
    onRemove: handleRemove,
    onEdit: (b: BookRow) => setEditing(b),
    isError,
    error,
    onRetry: () => refetch(),
    page,
    onPageChange: setPage,
  };

  const hasActiveFilters = statusFilter !== "all" || fileTypeFilter !== "all" || activeCollection !== null;

  return (
    <div className="w-full mx-auto max-w-7xl px-0 sm:px-2 py-2 sm:py-6 space-y-5 sm:space-y-6">
      {/* Cabeçalho */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Biblioteca Digital</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Organize seus PDFs e EPUBs por categoria, coleção e acompanhe o progresso de leitura.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" className="gap-2 flex-1 md:flex-none" onClick={syncMissingCovers} disabled={syncing || books.length === 0}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="truncate">Sincronizar capas</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 flex-1 md:flex-none" onClick={() => setStorageOpen((v) => !v)}>
            <HardDrive className="h-4 w-4" />
            <span className="truncate">Armazenamento</span>
          </Button>
          <Button size="sm" className="gap-2 flex-1 md:flex-none" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" /> Enviar livros
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatTile icon={LibraryIcon} label="Livros" value={String(stats.total)} />
        <StatTile icon={Layers} label="Categorias" value={String(stats.categories)} />
        <StatTile icon={Clock} label="Em leitura" value={String(stats.reading)} />
        <StatTile icon={CheckCircle2} label="Concluídos" value={String(stats.completed)} />
      </div>

      {/* "Continuar lendo" */}
      {continueLast.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Continuar lendo</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none">
            {continueLast.map((b) => {
              const isEpub = b.file_path.toLowerCase().endsWith(".epub");
              const pct = isEpub
                ? ((b as BookRow & { last_read_pct?: number }).last_read_pct ?? 0)
                : b.total_pages
                  ? Math.min(100, Math.round(((b.last_read_page ?? 0) / b.total_pages) * 100))
                  : 0;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => navigate(`/leitor/${b.id}`)}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/40 transition-colors min-w-[220px] max-w-[260px] shrink-0 text-left"
                >
                  <div className="w-10 shrink-0">
                    <BookCover path={b.cover_path} title={b.title} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{b.title}</p>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                      <span>{isEpub ? `${pct}%` : `Pág. ${b.last_read_page ?? 0}`}</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Gerenciador de armazenamento (colapsável) */}
      {storageOpen && user && (
        <div className="border rounded-lg p-4 bg-card space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Gerenciador de Armazenamento</h2>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStorageOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <StorageManager userId={user.id} onRefreshBooks={() => refetch()} />
        </div>
      )}

      {/* Layout: sidebar + conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 lg:gap-6">
        <aside className="space-y-4">
          {/* Categorias */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold px-1">Categorias</p>
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 -mx-3 px-3 lg:mx-0 lg:px-0 scrollbar-none">
              <CategoryButton active={activeCategory === "all"} onClick={() => setActiveCategory("all")} label="Todas" count={books.length} />
              {categories.list.map((c) => (
                <CategoryButton
                  key={c.name}
                  active={activeCategory === c.name}
                  onClick={() => setActiveCategory(c.name)}
                  label={c.name}
                  count={c.count}
                />
              ))}
              {categories.none > 0 && (
                <CategoryButton
                  active={activeCategory === UNCATEGORIZED}
                  onClick={() => setActiveCategory(UNCATEGORIZED)}
                  label="Sem categoria"
                  count={categories.none}
                />
              )}
            </div>
          </div>

          {/* Coleções */}
          <CollectionsPanel
            activeCollectionId={activeCollection}
            onSelectCollection={setActiveCollection}
          />
        </aside>

        <section className="space-y-4 min-w-0">
          {/* Barra de ações em lote */}
          <BatchActionsBar
            selectedCount={selected.size}
            onClearSelection={() => setSelected(new Set())}
            onSelectAll={selectAll}
            onBatchDelete={handleBatchDelete}
            onBatchAddToCollection={() => {
              if (!batchCollectionId) {
                toast.error("Selecione uma coleção primeiro no menu.");
                return;
              }
              handleBatchAddToCollection();
            }}
            isDeleting={batchDeleting}
          />

          {/* Barra de busca e filtros */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por título, autor, categoria ou ISBN..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              {/* Filtros combinados */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={hasActiveFilters ? "default" : "outline"} size="sm" className="gap-2 h-9">
                    <Filter className="h-4 w-4" />
                    Filtros
                    {hasActiveFilters && <Badge className="ml-1 bg-primary-foreground text-primary text-[10px] px-1 py-0">!</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  {(["all", "to-read", "reading", "completed", "abandoned"] as const).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className={statusFilter === s ? "bg-muted" : ""}>
                      {s === "all" ? "Todos" : BOOK_STATUSES.find((x) => x.value === s)?.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Tipo de arquivo</DropdownMenuLabel>
                  {(["all", "pdf", "epub"] as const).map((t) => (
                    <DropdownMenuItem key={t} onClick={() => setFileTypeFilter(t)} className={fileTypeFilter === t ? "bg-muted" : ""}>
                      {t === "all" ? "Todos" : t.toUpperCase()}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  {hasActiveFilters && (
                    <DropdownMenuItem onClick={() => { setStatusFilter("all"); setFileTypeFilter("all"); setActiveCollection(null); }}>
                      <X className="h-3.5 w-3.5 mr-2" /> Limpar filtros
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Para ações em lote: selecionar coleção */}
              {selected.size > 0 && collections.length > 0 && (
                <Select value={batchCollectionId} onValueChange={setBatchCollectionId}>
                  <SelectTrigger className="h-9 w-36 text-xs">
                    <SelectValue placeholder="Coleção..." />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="flex-1 sm:w-[180px] sm:flex-none h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="title">Título (A-Z)</SelectItem>
                  <SelectItem value="author">Autor (A-Z)</SelectItem>
                  <SelectItem value="progress">Maior progresso</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-1 shrink-0">
                <Button
                  variant={view === "grid" ? "default" : "outline"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setView("grid")}
                  aria-label="Visualizar em grade"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === "list" ? "default" : "outline"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setView("list")}
                  aria-label="Visualizar em lista"
                >
                  <ListIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Abas principais */}
          <Tabs defaultValue="all" className="w-full">
            <div className="-mx-3 px-3 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none">
              <TabsList className="w-max min-w-full justify-start">
                <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-nowrap">Todos ({filtered.length})</TabsTrigger>
                <TabsTrigger value="reading" className="text-xs sm:text-sm whitespace-nowrap">Em leitura ({reading.length})</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm whitespace-nowrap">Concluídos ({completed.length})</TabsTrigger>
                <TabsTrigger value="reports" className="text-xs sm:text-sm whitespace-nowrap">Relatórios</TabsTrigger>
                <TabsTrigger value="ai-plan" className="text-xs sm:text-sm whitespace-nowrap">Plano IA</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-4">
              <BookGrid books={filtered} isLoading={isLoading} {...gridProps} />
            </TabsContent>
            <TabsContent value="reading" className="mt-4">
              <BookGrid books={reading} isLoading={isLoading} {...gridProps} />
            </TabsContent>
            <TabsContent value="completed" className="mt-4">
              <BookGrid books={completed} isLoading={isLoading} {...gridProps} />
            </TabsContent>
            <TabsContent value="reports" className="mt-4">
              <LibraryReports books={books} />
            </TabsContent>
            <TabsContent value="ai-plan" className="mt-4">
              <ReadingPlanAI books={books} />
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {/* Diálogos */}
      {user && (
        <BookUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          userId={user.id}
          categories={categoryNames}
          onCreate={(payload) => create.mutateAsync(payload)}
        />
      )}

      <BookEditDialog
        book={editing}
        categories={categoryNames}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSave={async (id, patch) => { await update.mutateAsync({ id, patch }); }}
      />

      <BookDetailDialog
        book={detailBook}
        open={!!detailBook}
        onOpenChange={(o) => !o && setDetailBook(null)}
        onRead={(id) => navigate(`/leitor/${id}`)}
        onEdit={(b) => { setDetailBook(null); setEditing(b); }}
        onRemove={handleRemove}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="tint-card">
      <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
        <div className="p-2 bg-primary/10 text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg sm:text-xl font-bold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryButton({
  active, onClick, label, count,
}: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2 text-sm border transition-colors shrink-0 lg:w-full",
        active
          ? "bg-primary/10 border-primary/40 text-primary font-medium"
          : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
      )}
    >
      <span className="flex items-center gap-2 truncate">
        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-[11px] tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function BookGrid({
  books,
  isLoading,
  view,
  selected,
  onToggleSelect,
  onOpen,
  onDetail,
  onRemove,
  onEdit,
  isError,
  error,
  onRetry,
  page,
  onPageChange,
}: {
  books: BookRow[];
  isLoading: boolean;
  view: "grid" | "list";
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onDetail: (book: BookRow) => void;
  onRemove: (id: string) => void;
  onEdit: (book: BookRow) => void;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (isLoading) return <LoadingState message="Carregando biblioteca..." />;
  if (isError) return <ErrorState title="Erro ao carregar a biblioteca" error={error} onRetry={onRetry} />;
  if (!books?.length) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Nenhum livro por aqui ainda"
        description="Envie seu primeiro PDF ou EPUB para começar a acompanhar sua leitura."
      />
    );
  }

  const progressOf = (b: BookRow) => {
    if (b.file_path.toLowerCase().endsWith(".epub")) {
      return (b as BookRow & { last_read_pct?: number }).last_read_pct ?? 0;
    }
    return b.total_pages && b.last_read_page
      ? Math.min(100, Math.round(((b.last_read_page ?? 0) / b.total_pages) * 100))
      : 0;
  };

  const totalPages = Math.max(1, Math.ceil(books.length / BOOKS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageBooks = books.slice((currentPage - 1) * BOOKS_PAGE_SIZE, currentPage * BOOKS_PAGE_SIZE);

  const pager = totalPages > 1 ? (
    <div className="flex items-center justify-between gap-3 pt-4">
      <p className="text-xs text-muted-foreground">
        Página {currentPage} de {totalPages} · {books.length} livros
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>Anterior</Button>
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>Próxima</Button>
      </div>
    </div>
  ) : null;

  if (view === "list") {
    return (
      <div>
        <div className="flex flex-col gap-2">
          {pageBooks.map((b) => (
            <Card key={b.id} className={cn("tint-card transition-colors", selected.has(b.id) && "ring-2 ring-primary")}>
              <CardContent className="p-3 flex items-center gap-3">
                {/* Checkbox de seleção */}
                <button
                  type="button"
                  onClick={() => onToggleSelect(b.id)}
                  className="shrink-0 text-muted-foreground hover:text-primary"
                  aria-label={selected.has(b.id) ? "Desmarcar" : "Selecionar"}
                >
                  {selected.has(b.id)
                    ? <CheckSquare2 className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4" />}
                </button>
                <div className="w-10 sm:w-12 shrink-0">
                  <BookCover path={b.cover_path} title={b.title} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm sm:text-base">{b.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {b.author || "Autor desconhecido"} · {statusLabel(b.status)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    {b.category && (
                      <Badge variant="outline" className="text-[10px] max-w-[45%] truncate">{b.category}</Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground truncate">
                      {b.file_path.toLowerCase().endsWith(".epub")
                        ? `${(b as BookRow & { last_read_pct?: number }).last_read_pct ?? 0}%`
                        : b.total_pages
                          ? `${b.last_read_page ?? 0}/${b.total_pages} pág. · ${progressOf(b)}%`
                          : "Sem paginação"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-0.5 sm:gap-1 shrink-0">
                  <Button size="sm" className="px-2 sm:px-3" onClick={() => onOpen(b.id)}>Abrir</Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => onDetail(b)} aria-label="Detalhes">
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => onEdit(b)} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => onRemove(b.id)} aria-label="Remover">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {pager}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {pageBooks.map((b) => {
          const progress = progressOf(b);
          const isSelected = selected.has(b.id);
          return (
            <Card
              key={b.id}
              className={cn(
                "tint-card group hover:shadow-md transition-shadow overflow-hidden",
                isSelected && "ring-2 ring-primary",
              )}
            >
              <div className="relative">
                <BookCover path={b.cover_path} title={b.title} />
                {/* Checkbox de seleção */}
                <button
                  type="button"
                  onClick={() => onToggleSelect(b.id)}
                  className={cn(
                    "absolute top-2 left-2 z-10 p-0.5 rounded transition-opacity",
                    "bg-background/80 backdrop-blur-sm",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                  aria-label={isSelected ? "Desmarcar" : "Selecionar"}
                >
                  {isSelected
                    ? <CheckSquare2 className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4 text-muted-foreground" />}
                </button>
                <Badge variant="secondary" className="absolute top-2 right-2 uppercase text-[10px]">
                  {inferFileType(b.file_path)}
                </Badge>
                {b.category && (
                  <Badge className="absolute bottom-2 left-2 text-[10px] max-w-[80%] truncate">
                    {b.category}
                  </Badge>
                )}
              </div>
              <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm sm:text-base line-clamp-2">{b.title}</CardTitle>
                {b.author && <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">{b.author}</p>}
              </CardHeader>
              <CardContent className="space-y-3 p-3 pt-0 sm:p-6 sm:pt-0">
                {b.total_pages || b.file_path.toLowerCase().endsWith(".epub") ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground gap-1">
                      <span>
                        {b.file_path.toLowerCase().endsWith(".epub")
                          ? "EPUB"
                          : `${b.last_read_page ?? 0} / ${b.total_pages} pág.`}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                ) : (
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Sem progresso registrado</p>
                )}
                <div className="flex gap-1 sm:gap-2">
                  <Button size="sm" className="flex-1 px-2" onClick={() => onOpen(b.id)}>Abrir</Button>
                  <Button size="sm" variant="ghost" className="px-2" onClick={() => onDetail(b)} aria-label="Detalhes">
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="px-2" onClick={() => onEdit(b)} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="px-2" onClick={() => onRemove(b.id)} aria-label="Remover">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {pager}
    </div>
  );
}
