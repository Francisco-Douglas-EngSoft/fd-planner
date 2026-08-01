import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { BookRow, BookUpdate } from "@/services/libraryService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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

export const BOOK_STATUSES = [
  { value: "to-read", label: "Para ler" },
  { value: "reading", label: "Em leitura" },
  { value: "completed", label: "Concluído" },
  { value: "abandoned", label: "Abandonado" },
] as const;

interface Props {
  book: BookRow | null;
  categories: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: BookUpdate) => Promise<void>;
}

export function BookEditDialog({ book, categories, open, onOpenChange, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<string>("to-read");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!book) return;
    setTitle(book.title ?? "");
    setAuthor(book.author ?? "");
    setCategory(book.category ?? "");
    setStatus(book.status ?? "to-read");
  }, [book]);

  async function handleSave() {
    if (!book) return;
    if (!title.trim()) {
      toast.error("O título é obrigatório");
      return;
    }
    try {
      setSaving(true);
      await onSave(book.id, {
        title: title.trim(),
        author: author.trim() || null,
        category: category.trim() || null,
        status,
      });
      toast.success("Livro atualizado");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar as alterações");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar livro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Autor</Label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input
                list="book-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Direito, TI, Idiomas..."
              />
              <datalist id="book-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOK_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}