/**
 * Gerenciador de armazenamento da biblioteca.
 * Mostra uso total, lista arquivos órfãos e grandes, permite limpeza.
 */
import { useEffect, useState } from "react";
import {
  HardDrive, Trash2, RefreshCw, AlertTriangle, FileX, Loader2,
  ChevronDown, ChevronUp, Database,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { libraryService } from "@/services/libraryService";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StorageFile {
  name: string;
  path: string;
  size: number;
  hasBook: boolean;
}

interface Props {
  userId: string;
  onRefreshBooks: () => void;
}

export function StorageManager({ userId, onRefreshBooks }: Props) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showOrphans, setShowOrphans] = useState(true);
  const [showLarge, setShowLarge] = useState(false);

  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  const orphans = files.filter((f) => !f.hasBook);
  const large = files.filter((f) => f.size > 20 * 1024 * 1024);
  const totalMB = (totalBytes / 1024 / 1024).toFixed(1);

  async function load() {
    setLoading(true);
    try {
      const { data: list } = await supabase.storage.from("books").list(userId, {
        limit: 500,
        sortBy: { column: "name", order: "asc" },
      });
      if (!list) return;

      const { data: books } = await supabase.from("books").select("file_path").eq("user_id", userId);
      const bookPaths = new Set((books ?? []).map((b) => b.file_path));

      const result: StorageFile[] = [];
      for (const f of list) {
        const path = `${userId}/${f.name}`;
        if (f.name.endsWith("/")) continue; // skip folders
        result.push({
          name: f.name,
          path,
          size: f.metadata?.size ?? 0,
          hasBook: bookPaths.has(path),
        });
      }
      setFiles(result);
    } catch (err) {
      toast.error("Erro ao carregar arquivos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [userId]);

  async function deleteOrphan(path: string) {
    if (!confirm("Excluir este arquivo do Storage? Ação irreversível.")) return;
    setDeleting(path);
    try {
      await libraryService.removeStorageObject(path);
      setFiles((prev) => prev.filter((f) => f.path !== path));
      toast.success("Arquivo removido");
    } catch {
      toast.error("Erro ao remover arquivo");
    } finally {
      setDeleting(null);
    }
  }

  async function deleteAllOrphans() {
    if (!confirm(`Remover ${orphans.length} arquivo(s) órfão(s) do Storage? Ação irreversível.`)) return;
    let ok = 0;
    for (const f of orphans) {
      try {
        await libraryService.removeStorageObject(f.path);
        ok++;
      } catch { /* continue */ }
    }
    await load();
    onRefreshBooks();
    toast.success(`${ok} arquivo(s) removido(s)`);
  }

  const fmtMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="space-y-4">
      {/* Uso total */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" /> Uso do Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{files.length} arquivo(s)</span>
            <span>{totalMB} MB usados</span>
          </div>
          <Progress value={Math.min(100, (totalBytes / (1024 * 1024 * 1024)) * 100)} className="h-1.5" />
          <div className="flex gap-2 flex-wrap text-xs">
            {orphans.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <FileX className="h-3 w-3" /> {orphans.length} órfão(s)
              </Badge>
            )}
            {large.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {large.length} grande(s)
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" className="gap-2 w-full" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Atualizar
          </Button>
        </CardContent>
      </Card>

      {/* Órfãos */}
      {orphans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              type="button"
              className="flex items-center justify-between w-full"
              onClick={() => setShowOrphans((v) => !v)}
            >
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <FileX className="h-4 w-4" /> Arquivos sem livro ({orphans.length})
              </CardTitle>
              {showOrphans ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CardHeader>
          {showOrphans && (
            <CardContent className="space-y-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={deleteAllOrphans}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover todos os órfãos
              </Button>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {orphans.map((f) => (
                  <div key={f.path} className="flex items-center justify-between gap-2 text-xs py-1 border-b last:border-0">
                    <span className="truncate text-muted-foreground">{f.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground">{fmtMB(f.size)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => deleteOrphan(f.path)}
                        disabled={deleting === f.path}
                        aria-label="Remover"
                      >
                        {deleting === f.path ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Grandes */}
      {large.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              type="button"
              className="flex items-center justify-between w-full"
              onClick={() => setShowLarge((v) => !v)}
            >
              <CardTitle className="text-sm flex items-center gap-2">
                <HardDrive className="h-4 w-4" /> Arquivos grandes &gt;20 MB ({large.length})
              </CardTitle>
              {showLarge ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CardHeader>
          {showLarge && (
            <CardContent>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {large.map((f) => (
                  <div key={f.path} className="flex items-center justify-between gap-2 text-xs py-1 border-b last:border-0">
                    <span className="truncate">{f.name}</span>
                    <Badge variant="outline" className="shrink-0">{fmtMB(f.size)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
