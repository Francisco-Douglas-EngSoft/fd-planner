/**
 * Dialog de detalhes completos de um livro.
 * Exibe metadados, progresso, coleções vinculadas e ações.
 */
import { useEffect, useState } from "react";
import {
  BookOpen, Calendar, Tag, Library, Layers, Clock,
  CheckCircle2, X, ExternalLink, Plus, Loader2, Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCollections } from "@/hooks/useCollections";
import { collectionsService } from "@/services/collectionsService";
import type { BookRow } from "@/services/libraryService";
import { BOOK_STATUSES } from "./BookEditDialog";
import { BookCover } from "./BookCover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  book: BookRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onRead: (id: string) => void;
  onEdit: (book: BookRow) => void;
  onRemove: (id: string) => void;
}

export function BookDetailDialog({ book, open, onOpenChange, onRead, onEdit, onRemove }: Props) {
  const { user } = useAuth();
  const { data: collections = [], addBook, removeBook } = useCollections();
  const [bookCollections, setBookCollections] = useState<string[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedToAdd, setSelectedToAdd] = useState<string>("");

  useEffect(() => {
    if (!book || !user) return;
    collectionsService.getBookCollections(book.id).then(setBookCollections).catch(() => {});
  }, [book, user]);

  if (!book) return null;

  const progress = book.total_pages && book.last_read_page
    ? Math.min(100, Math.round((book.last_read_page / book.total_pages) * 100))
    : 0;

  const statusLabel = BOOK_STATUSES.find((s) => s.value === (book.status ?? "to-read"))?.label ?? "Para ler";
  const fileType = book.file_path.toLowerCase().endsWith(".epub") ? "EPUB" : "PDF";
  const sizeMB = book.file_size ? (book.file_size / 1024 / 1024).toFixed(1) : null;

  const availableToAdd = collections.filter((c) => !bookCollections.includes(c.id));

  async function toggleCollection(collectionId: string) {
    if (!book) return;
    setToggling(collectionId);
    try {
      if (bookCollections.includes(collectionId)) {
        await removeBook.mutateAsync({ bookId: book.id, collectionId });
        setBookCollections((prev) => prev.filter((id) => id !== collectionId));
      } else {
        await addBook.mutateAsync({ bookId: book.id, collectionId });
        setBookCollections((prev) => [...prev, collectionId]);
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleAddToCollection() {
    if (!selectedToAdd) return;
    await toggleCollection(selectedToAdd);
    setSelectedToAdd("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Detalhes do livro</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Capa */}
          <div className="w-24 sm:w-32 shrink-0">
            <BookCover path={book.cover_path} title={book.title} />
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0 space-y-2">
            <h2 className="font-bold text-lg leading-tight">{book.title}</h2>
            {book.author && (
              <p className="text-sm text-muted-foreground">{book.author}</p>
            )}

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs gap-1">
                <BookOpen className="h-3 w-3" /> {fileType}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-xs", book.status === "completed" && "border-green-500/50 text-green-600")}
              >
                {statusLabel}
              </Badge>
              {book.category && (
                <Badge variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />{book.category}
                </Badge>
              )}
              {sizeMB && (
                <Badge variant="outline" className="text-xs">
                  {sizeMB} MB
                </Badge>
              )}
            </div>

            {/* Progresso */}
            {book.total_pages ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso: {book.last_read_page ?? 0}/{book.total_pages} pág.</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            ) : null}

            {/* Datas */}
            <p className="text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 inline mr-1" />
              Adicionado em {new Date(book.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        {/* Coleções */}
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Library className="h-4 w-4" /> Coleções
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {bookCollections.map((cid) => {
              const col = collections.find((c) => c.id === cid);
              if (!col) return null;
              return (
                <Badge
                  key={cid}
                  variant="outline"
                  className="gap-1 pr-1 cursor-pointer hover:bg-muted"
                  style={{ borderColor: col.color ?? undefined }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: col.color ?? "#6366f1" }}
                  />
                  {col.name}
                  <button
                    type="button"
                    aria-label={`Remover da coleção ${col.name}`}
                    onClick={() => toggleCollection(cid)}
                    disabled={toggling === cid}
                    className="ml-0.5 hover:text-destructive"
                  >
                    {toggling === cid ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  </button>
                </Badge>
              );
            })}
            {bookCollections.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma coleção.</p>
            )}
          </div>

          {availableToAdd.length > 0 && (
            <div className="flex gap-2">
              <Select value={selectedToAdd} onValueChange={setSelectedToAdd}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Adicionar à coleção..." />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color ?? "#6366f1" }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 gap-1 text-xs" onClick={handleAddToCollection} disabled={!selectedToAdd}>
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button className="flex-1 sm:flex-none gap-2" onClick={() => { onRead(book.id); onOpenChange(false); }}>
            <BookOpen className="h-4 w-4" /> Ler agora
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none gap-2" onClick={() => { onEdit(book); onOpenChange(false); }}>
            Editar metadados
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => { onRemove(book.id); onOpenChange(false); }}
            aria-label="Remover livro"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
