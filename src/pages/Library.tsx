import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Upload,
  Trash2,
  Search,
  Loader2,
  RefreshCw,
  Library as LibraryIcon,
  FolderOpen,
  Pencil,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBooks } from "@/hooks/useBooks";
import { libraryService, type BookRow } from "@/services/libraryService";
import { extractPdfMetadata } from "@/lib/pdfMetadata";
import { BookCover } from "@/components/library/BookCover";
import { BookEditDialog, BOOK_STATUSES } from "@/components/library/BookEditDialog";
import { BookUploadDialog } from "@/components/library/BookUploadDialog";
import { LibraryReports } from "@/components/library/LibraryReports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const UNCATEGORIZED = "__uncategorized__";

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

export default function Library() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: books = [], isLoading, create, update, remove } = useBooks();

  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editing, setEditing] = useState<BookRow | null>(null);

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
      if (activeCategory === UNCATEGORIZED && cat) return false;
      if (activeCategory !== "all" && activeCategory !== UNCATEGORIZED && cat !== activeCategory) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        (b.author ?? "").toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      );
    });

    const progressOf = (b: BookRow) =>
      b.total_pages ? (b.last_read_page ?? 0) / b.total_pages : 0;

    list = [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "pt-BR");
      if (sort === "author") return (a.author ?? "").localeCompare(b.author ?? "", "pt-BR");
      if (sort === "progress") return progressOf(b) - progressOf(a);
      return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
    });
    return list;
  }, [books, query, activeCategory, sort]);

  const reading = filtered.filter((b) => (b.last_read_page ?? 0) > 0 && (b.status ?? "") !== "completed");
  const completed = filtered.filter((b) => b.status === "completed");

  const stats = useMemo(() => {
    const totalPages = books.reduce((s, b) => s + (b.total_pages ?? 0), 0);
    const readPages = books.reduce((s, b) => s + Math.min(b.last_read_page ?? 0, b.total_pages ?? 0), 0);
    return {
      total: books.length,
      completed: books.filter((b) => b.status === "completed").length,
      reading: books.filter((b) => (b.last_read_page ?? 0) > 0 && b.status !== "completed").length,
      categories: categories.list.length,
      pagesPct: totalPages ? Math.round((readPages / totalPages) * 100) : 0,
    };
  }, [books, categories]);

  async function handleRemove(id: string) {
    if (!confirm("Remover este livro da biblioteca?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Livro removido");
    } catch {
      toast.error("Erro ao remover");
    }
  }

  async function syncMissingCovers() {
    if (!user) return;
    const targets = books.filter(
      (b) => (!b.cover_path || !b.total_pages) && b.file_path.toLowerCase().endsWith(".pdf"),
    );
    if (targets.length === 0) {
      toast.info("Todos os PDFs já possuem capa e paginação.");
      return;
    }
    setSyncing(true);
    let ok = 0;
    let fail = 0;
    for (const b of targets) {
      try {
        const signed = await libraryService.getSignedUrl(b.file_path, 300);
        const res = await fetch(signed);
        const buf = await res.arrayBuffer();
        const meta = await extractPdfMetadata(buf);
        let coverPath = b.cover_path ?? null;
        if (!coverPath && meta.coverBlob) {
          coverPath = await libraryService.uploadCover(user.id, meta.coverBlob);
        }
        await update.mutateAsync({
          id: b.id,
          patch: {
            cover_path: coverPath,
            total_pages: b.total_pages || meta.totalPages,
            author: b.author || meta.author,
          },
        });
        ok++;
      } catch (err) {
        console.warn("[Library] sync cover falhou", b.id, err);
        fail++;
      }
    }
    setSyncing(false);
    toast.success(`Capas sincronizadas: ${ok} · falhas: ${fail}`);
  }

  const gridProps = {
    view,
    onOpen: (id: string) => navigate(`/leitor/${id}`),
    onRemove: handleRemove,
    onEdit: (b: BookRow) => setEditing(b),
  };

  return (
    <div className="container mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 space-y-5 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Biblioteca Digital</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Organize seus PDFs e EPUBs por categoria e acompanhe o progresso de leitura.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 flex-1 md:flex-none"
            onClick={syncMissingCovers}
            disabled={syncing || books.length === 0}
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="truncate">Sincronizar capas</span>
          </Button>
          <Button size="sm" className="gap-2 flex-1 md:flex-none" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Enviar livros
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatTile icon={LibraryIcon} label="Livros" value={String(stats.total)} />
        <StatTile icon={Layers} label="Categorias" value={String(stats.categories)} />
        <StatTile icon={Clock} label="Em leitura" value={String(stats.reading)} />
        <StatTile icon={CheckCircle2} label="Concluídos" value={String(stats.completed)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4 lg:gap-6">
        <aside className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold px-1">
            Categorias
          </p>
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 -mx-3 px-3 lg:mx-0 lg:px-0 scrollbar-none">
            <CategoryButton
              active={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              label="Todas"
              count={books.length}
            />
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
          {categories.list.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 pt-2">
              Defina a categoria ao enviar um livro ou editando um livro existente.
            </p>
          )}
        </aside>

        <section className="space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por título, autor ou categoria..."
                className="pl-9"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-full sm:w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="title">Título (A-Z)</SelectItem>
                <SelectItem value="author">Autor (A-Z)</SelectItem>
                <SelectItem value="progress">Maior progresso</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                variant={view === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setView("grid")}
                aria-label="Visualizar em grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setView("list")}
                aria-label="Visualizar em lista"
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">Todos ({filtered.length})</TabsTrigger>
              <TabsTrigger value="reading">Em leitura ({reading.length})</TabsTrigger>
              <TabsTrigger value="completed">Concluídos ({completed.length})</TabsTrigger>
              <TabsTrigger value="reports">Relatórios</TabsTrigger>
            </TabsList>

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
          </Tabs>
        </section>
      </div>

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
        onSave={async (id, patch) => {
          await update.mutateAsync({ id, patch });
        }}
      />
    </div>
  );
}

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
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
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
  onOpen,
  onRemove,
  onEdit,
}: {
  books: BookRow[];
  isLoading: boolean;
  view: "grid" | "list";
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (book: BookRow) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando biblioteca...
      </div>
    );
  }
  if (!books || books.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
          <BookOpen className="h-10 w-10" />
          <p>Nenhum livro por aqui ainda. Envie seu primeiro PDF ou EPUB.</p>
        </CardContent>
      </Card>
    );
  }

  const progressOf = (b: BookRow) =>
    b.total_pages && b.last_read_page
      ? Math.min(100, Math.round(((b.last_read_page ?? 0) / b.total_pages) * 100))
      : 0;

  if (view === "list") {
    return (
      <div className="flex flex-col gap-2">
        {books.map((b) => (
          <Card key={b.id} className="tint-card">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-12 shrink-0">
                <BookCover path={b.cover_path} title={b.title} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{b.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {b.author || "Autor desconhecido"} · {statusLabel(b.status)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {b.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {b.category}
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {b.total_pages ? `${b.last_read_page ?? 0}/${b.total_pages} pág. · ${progressOf(b)}%` : "Sem paginação"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" onClick={() => onOpen(b.id)}>Abrir</Button>
                <Button size="icon" variant="ghost" onClick={() => onEdit(b)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onRemove(b.id)} aria-label="Remover">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {books.map((b) => {
        const progress = progressOf(b);
        return (
          <Card key={b.id} className="tint-card group hover:shadow-md transition-shadow overflow-hidden">
            <div className="relative">
              <BookCover path={b.cover_path} title={b.title} />
              <Badge variant="secondary" className="absolute top-2 right-2 uppercase text-[10px]">
                {inferFileType(b.file_path)}
              </Badge>
              {b.category && (
                <Badge className="absolute top-2 left-2 text-[10px] max-w-[60%] truncate">
                  {b.category}
                </Badge>
              )}
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-base line-clamp-2">{b.title}</CardTitle>
              {b.author && <p className="text-xs text-muted-foreground line-clamp-1">{b.author}</p>}
            </CardHeader>
            <CardContent className="space-y-3">
              {b.total_pages ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{b.last_read_page ?? 0} / {b.total_pages} pág.</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sem progresso registrado</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => onOpen(b.id)}>
                  Abrir
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onEdit(b)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onRemove(b.id)} aria-label="Remover">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
