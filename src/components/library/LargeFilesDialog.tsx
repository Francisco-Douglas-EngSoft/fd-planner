import { useCallback, useEffect, useState } from "react";
import { HardDrive, Loader2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LIMIT_MB = 20;
const LIMIT = LIMIT_MB * 1024 * 1024;

interface LargeItem {
  path: string;
  size: number;
  bookId: string | null;
  title: string;
  coverPath: string | null;
}

const fmt = (b: number) => `${(b / 1048576).toFixed(1)} MB`;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
}

export function LargeFilesDialog({ open, onOpenChange, userId }: Props) {
  const qc = useQueryClient();
  const [items, setItems] = useState<LargeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Arquivos no Storage (inclui arquivos órfãos sem livro cadastrado)
      const files: { name: string; size: number }[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.storage.from("books").list(userId, { limit: 1000, offset });
        if (error) throw error;
        (data ?? []).forEach((f) => {
          const size = Number((f.metadata as any)?.size ?? 0);
          if (f.id && size > LIMIT) files.push({ name: `${userId}/${f.name}`, size });
        });
        if (!data || data.length < 1000) break;
      }
      const { data: books, error } = await supabase
        .from("books").select("id,title,file_path,file_size,cover_path").eq("user_id", userId);
      if (error) throw error;
      const byPath = new Map((books ?? []).map((b) => [b.file_path, b]));
      const list: LargeItem[] = files.map((f) => {
        const b = byPath.get(f.name);
        return { path: f.name, size: f.size, bookId: b?.id ?? null, title: b?.title ?? "Arquivo sem livro cadastrado", coverPath: b?.cover_path ?? null };
      });
      // Livros cadastrados acima do limite cujo arquivo não apareceu no Storage
      (books ?? []).forEach((b) => {
        if ((b.file_size ?? 0) > LIMIT && !files.some((f) => f.name === b.file_path)) {
          list.push({ path: b.file_path, size: b.file_size ?? 0, bookId: b.id, title: b.title, coverPath: b.cover_path });
        }
      });
      list.sort((a, b) => b.size - a.size);
      setItems(list);
      setSelected(new Set(list.map((i) => i.path)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao listar arquivos");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const chosen = items.filter((i) => selected.has(i.path));
  const total = chosen.reduce((s, i) => s + i.size, 0);

  async function doDelete() {
    setDeleting(true);
    try {
      const paths = chosen.flatMap((i) => [i.path, ...(i.coverPath ? [i.coverPath] : [])]);
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await supabase.storage.from("books").remove(paths.slice(i, i + 100));
        if (error) throw error;
      }
      const ids = chosen.map((i) => i.bookId).filter(Boolean) as string[];
      if (ids.length) {
        await supabase.from("annotations").delete().in("book_id", ids);
        await supabase.from("bookmarks").delete().in("book_id", ids);
        await supabase.from("reading_sessions").delete().in("book_id", ids);
        await supabase.from("book_collections").delete().in("book_id", ids);
        const { error } = await supabase.from("books").delete().in("id", ids);
        if (error) throw error;
      }
      toast.success(`${chosen.length} arquivo(s) excluído(s) · ${fmt(total)} liberados`);
      qc.invalidateQueries({ queryKey: ["books", userId] });
      setConfirm(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  const toggle = (p: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> Arquivos acima de {LIMIT_MB} MB</DialogTitle>
            <DialogDescription>Selecione os arquivos para excluir do armazenamento e da biblioteca.</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum arquivo acima de {LIMIT_MB} MB. 🎉</p>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={selected.size === items.length}
                  onCheckedChange={(c) => setSelected(c ? new Set(items.map((i) => i.path)) : new Set())}
                />
                Selecionar todos ({items.length})
              </label>
              {items.map((i) => (
                <label key={i.path} className="flex items-center gap-3 border border-border p-3 cursor-pointer hover:bg-muted/40">
                  <Checkbox checked={selected.has(i.path)} onCheckedChange={() => toggle(i.path)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{i.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{i.path.split("/").pop()}</p>
                  </div>
                  {!i.bookId && <Badge variant="outline" className="shrink-0">Órfão</Badge>}
                  <span className="text-sm font-semibold tabular-nums shrink-0">{fmt(i.size)}</span>
                </label>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={load} disabled={loading || deleting} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </Button>
            <Button variant="destructive" disabled={!chosen.length || deleting} onClick={() => setConfirm(true)} className="gap-2">
              <Trash2 className="h-4 w-4" /> Excluir {chosen.length ? `(${chosen.length} · ${fmt(total)})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm} onOpenChange={(o) => !deleting && setConfirm(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {chosen.length} arquivo(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão apagados permanentemente {fmt(total)} do armazenamento, junto com os livros, anotações,
              marcadores e sessões de leitura ligados a eles. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
