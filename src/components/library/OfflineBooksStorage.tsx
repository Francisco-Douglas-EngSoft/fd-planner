import { useCallback, useEffect, useState } from "react";
import { Loader2, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { listOfflineBooks, OFFLINE_BOOKS_CHANGED, removeOfflineBook } from "@/lib/offlineBooks";

const fmtMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Livros guardados no aparelho: espaço ocupado e remoção. */
export function OfflineBooksStorage() {
  const [books, setBooks] = useState<{ id: string; title: string; size: number }[]>([]);
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBooks(await listOfflineBooks());
    try {
      const est = await navigator.storage?.estimate?.();
      if (est?.quota) setQuota({ usage: est.usage ?? 0, quota: est.quota });
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(OFFLINE_BOOKS_CHANGED, load);
    return () => window.removeEventListener(OFFLINE_BOOKS_CHANGED, load);
  }, [load]);

  async function remove(id: string) {
    setRemoving(id);
    try {
      await removeOfflineBook(id);
      toast.success("Livro removido do aparelho");
    } catch {
      toast.error("Não foi possível remover");
    } finally {
      setRemoving(null);
    }
  }

  async function removeAll() {
    if (!confirm(`Remover ${books.length} livro(s) guardado(s) no aparelho? Eles continuam na sua biblioteca online.`)) return;
    for (const b of books) await removeOfflineBook(b.id).catch(() => {});
    toast.success("Livros removidos do aparelho");
  }

  const total = books.reduce((s, b) => s + b.size, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> Livros no aparelho (offline)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{books.length} livro(s)</span>
          <span>{fmtMB(total)} usados</span>
        </div>
        {quota && (
          <>
            <Progress value={Math.min(100, (quota.usage / quota.quota) * 100)} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">
              Espaço do app no aparelho: {fmtMB(quota.usage)} de {fmtMB(quota.quota)}
            </p>
          </>
        )}
        {books.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum livro baixado. Abra um livro e toque em "Baixar para ler offline".
          </p>
        ) : (
          <>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {books.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b last:border-0">
                  <span className="truncate">{b.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground">{fmtMB(b.size)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => void remove(b.id)}
                      disabled={removing === b.id}
                      aria-label={`Remover ${b.title} do aparelho`}
                    >
                      {removing === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => void removeAll()}>
              <Trash2 className="h-3.5 w-3.5" /> Remover todos do aparelho
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
