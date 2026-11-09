/**
 * Gerenciador de armazenamento da biblioteca.
 * Mostra o uso de tudo no Storage (meta 800 MB / limite 1 GB), os maiores livros,
 * arquivos órfãos e os livros guardados no aparelho.
 */
import { useState } from "react";
import {
  Trash2, RefreshCw, FileX, Loader2, ChevronDown, ChevronUp, Database, ArrowDownWideNarrow,
} from "lucide-react";
import { toast } from "sonner";
import { libraryService, type BookRow } from "@/services/libraryService";
import { useStorageUsage } from "@/hooks/useStorageUsage";
import { BUCKET_LABELS, STORAGE_BUDGET_BYTES, formatBytes } from "@/lib/libraryStorage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OfflineBooksStorage } from "./OfflineBooksStorage";

interface Props {
  userId: string;
  books: BookRow[];
  onRefreshBooks: () => void;
  onOpenBook?: (book: BookRow) => void;
}

export function StorageManager({ books, onRefreshBooks, onOpenBook }: Props) {
  const storage = useStorageUsage(books);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showOrphans, setShowOrphans] = useState(true);
  const [showAllBooks, setShowAllBooks] = useState(false);

  const ranked = [...books]
    .map((b) => ({ book: b, size: storage.perBook.get(b.id)?.total ?? 0 }))
    .sort((a, b) => b.size - a.size);
  const booksTotal = ranked.reduce((s, r) => s + r.size, 0);
  const visible = showAllBooks ? ranked : ranked.slice(0, 10);
  const orphanTotal = storage.orphans.reduce((s, o) => s + o.size, 0);

  async function deleteOrphan(path: string) {
    if (!confirm("Excluir este arquivo do Storage? Ação irreversível.")) return;
    setDeleting(path);
    try {
      await libraryService.removeStorageObject(path);
      await storage.refetch();
      toast.success("Arquivo removido");
    } catch {
      toast.error("Erro ao remover arquivo");
    } finally {
      setDeleting(null);
    }
  }

  async function deleteAllOrphans() {
    if (!confirm(`Remover ${storage.orphans.length} arquivo(s) órfão(s) (${formatBytes(orphanTotal)})? Ação irreversível.`)) return;
    let ok = 0;
    for (const f of storage.orphans) {
      try {
        await libraryService.removeStorageObject(f.name);
        ok++;
      } catch { /* continue */ }
    }
    await storage.refetch();
    onRefreshBooks();
    toast.success(`${ok} arquivo(s) removido(s)`);
  }

  return (
    <div className="space-y-4">
      {/* Uso por pasta */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Database className="h-4 w-4" /> Uso do Storage</span>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => storage.refetch()} disabled={storage.isLoading}>
              {storage.isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Atualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs">
          {Object.entries(storage.byBucket).sort((a, b) => b[1] - a[1]).map(([id, size]) => (
            <div key={id} className="flex justify-between">
              <span className="text-muted-foreground">{BUCKET_LABELS[id] ?? id}</span>
              <span className="tabular-nums font-medium">{formatBytes(size)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-1.5 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatBytes(storage.total)} / {formatBytes(STORAGE_BUDGET_BYTES)}</span>
          </div>
          {storage.estimated && (
            <p className="text-[11px] text-muted-foreground">Sem conexão: valor estimado pelos livros cadastrados.</p>
          )}
        </CardContent>
      </Card>

      {/* Tamanho de cada livro */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><ArrowDownWideNarrow className="h-4 w-4" /> Tamanho de cada livro</span>
            <span className="text-xs font-normal text-muted-foreground tabular-nums">{books.length} livros · {formatBytes(booksTotal)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {ranked.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum livro enviado ainda.</p>
          ) : (
            <>
              <div className="max-h-72 overflow-y-auto">
                {visible.map(({ book, size }) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => onOpenBook?.(book)}
                    className="w-full text-left py-1.5 border-b last:border-0 hover:bg-muted/40 px-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{book.title}</span>
                      <span className="tabular-nums shrink-0 font-medium">{formatBytes(size)}</span>
                    </div>
                    <div className="h-1 bg-muted mt-1 overflow-hidden">
                      <div className="h-full bg-primary/70" style={{ width: `${ranked[0].size ? (size / ranked[0].size) * 100 : 0}%` }} />
                    </div>
                  </button>
                ))}
              </div>
              {ranked.length > 10 && (
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowAllBooks((v) => !v)}>
                  {showAllBooks ? "Mostrar só os 10 maiores" : `Ver todos (${ranked.length})`}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Órfãos */}
      {storage.orphans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              type="button"
              className="flex items-center justify-between w-full"
              onClick={() => setShowOrphans((v) => !v)}
            >
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <FileX className="h-4 w-4" /> Arquivos sem livro ({storage.orphans.length} · {formatBytes(orphanTotal)})
              </CardTitle>
              {showOrphans ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CardHeader>
          {showOrphans && (
            <CardContent className="space-y-2">
              <p className="text-[11px] text-muted-foreground">Ocupam espaço sem aparecer na biblioteca. Remover libera espaço.</p>
              <Button variant="destructive" size="sm" className="w-full gap-2 text-xs" onClick={deleteAllOrphans}>
                <Trash2 className="h-3.5 w-3.5" /> Remover todos os órfãos
              </Button>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {storage.orphans.map((f) => (
                  <div key={f.name} className="flex items-center justify-between gap-2 text-xs py-1 border-b last:border-0">
                    <span className="truncate text-muted-foreground">{f.name.split("/").slice(1).join("/")}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="tabular-nums">{formatBytes(f.size)}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => deleteOrphan(f.name)}
                        disabled={deleting === f.name}
                        aria-label="Remover"
                      >
                        {deleting === f.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <OfflineBooksStorage />
    </div>
  );
}
