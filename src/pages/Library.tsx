import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Upload, Trash2, Search, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBooks } from "@/hooks/useBooks";
import { libraryService } from "@/services/libraryService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function inferFileType(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "epub") return "epub";
  return ext || "file";
}

export default function Library() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: books = [], isLoading, create, remove } = useBooks();

  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.author ?? "").toLowerCase().includes(q) ||
        (b.category ?? "").toLowerCase().includes(q),
    );
  }, [books, query]);

  const reading = filtered.filter((b) => (b.last_read_page ?? 0) > 0 && (b.status ?? "") !== "completed");
  const completed = filtered.filter((b) => b.status === "completed");

  async function handleUpload() {
    if (!user || !file || !title.trim()) {
      toast.error("Título e arquivo são obrigatórios");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "epub"].includes(ext)) {
      toast.error("Formato inválido. Envie um PDF ou EPUB.");
      return;
    }
    // Limite prático do Supabase Storage por request: 50MB.
    const MAX_MB = 50;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo ${MAX_MB}MB.`);
      return;
    }
    try {
      setUploading(true);
      const path = await libraryService.uploadFile(user.id, file);
      await create.mutateAsync({
        title: title.trim(),
        author: author.trim() || null,
        category: category.trim() || null,
        file_path: path,
        file_size: file.size,
        status: "pending",
      });
      toast.success("Livro adicionado à biblioteca");
      setUploadOpen(false);
      setTitle("");
      setAuthor("");
      setCategory("");
      setFile(null);
    } catch (err) {
      console.error("[Library] upload error", err);
      const msg = err instanceof Error ? err.message : "Falha ao enviar arquivo";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remover este livro da biblioteca?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Livro removido");
    } catch {
      toast.error("Erro ao remover");
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Biblioteca Digital</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seus PDFs e EPUBs de estudo, com progresso de leitura.
          </p>
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Enviar livro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar à biblioteca</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Direito Constitucional" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Autor</Label>
                  <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Direito, TI, ..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Arquivo (PDF ou EPUB) *</Label>
                <Input
                  type="file"
                  accept=".pdf,.epub,application/pdf,application/epub+zip"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={uploading} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, autor ou categoria..."
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Todos ({filtered.length})</TabsTrigger>
          <TabsTrigger value="reading">Em leitura ({reading.length})</TabsTrigger>
          <TabsTrigger value="completed">Concluídos ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <BookGrid books={filtered} isLoading={isLoading} onOpen={(id) => navigate(`/leitor/${id}`)} onRemove={handleRemove} />
        </TabsContent>
        <TabsContent value="reading" className="mt-4">
          <BookGrid books={reading} isLoading={isLoading} onOpen={(id) => navigate(`/leitor/${id}`)} onRemove={handleRemove} />
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <BookGrid books={completed} isLoading={isLoading} onOpen={(id) => navigate(`/leitor/${id}`)} onRemove={handleRemove} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookGrid({
  books,
  isLoading,
  onOpen,
  onRemove,
}: {
  books: ReturnType<typeof useBooks>["data"];
  isLoading: boolean;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {books.map((b) => {
        const progress = b.total_pages && b.last_read_page
          ? Math.min(100, Math.round(((b.last_read_page ?? 0) / b.total_pages) * 100))
          : 0;
        return (
          <Card key={b.id} className="tint-card group hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="p-2 rounded-md bg-primary/10 tint-icon">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="secondary" className="uppercase text-[10px]">
                  {inferFileType(b.file_path)}
                </Badge>
              </div>
              <CardTitle className="text-base mt-2 line-clamp-2">{b.title}</CardTitle>
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
                <Button size="sm" variant="ghost" onClick={() => onRemove(b.id)}>
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
