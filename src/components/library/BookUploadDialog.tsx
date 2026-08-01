import { useCallback, useRef, useState } from "react";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { libraryService, type BookInsert } from "@/services/libraryService";
import { extractPdfMetadata } from "@/lib/pdfMetadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MAX_MB = 50;
const ACCEPTED = ["pdf", "epub"];

type ItemStatus = "pending" | "analyzing" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  title: string;
  author: string;
  pages: number;
  coverBlob: Blob | null;
  status: ItemStatus;
  progress: number;
  error?: string;
}

function prettyTitle(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  categories: string[];
  onCreate: (payload: Omit<BookInsert, "user_id">) => Promise<unknown>;
}

export function BookUploadDialog({ open, onOpenChange, userId, categories, onCreate }: Props) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [category, setCategory] = useState("");
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = useCallback((id: string, data: Partial<QueueItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...data } : it)));
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (!files) return;
      const incoming = Array.from(files);
      const accepted: QueueItem[] = [];
      for (const file of incoming) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!ACCEPTED.includes(ext)) {
          toast.error(`${file.name}: formato inválido (envie PDF ou EPUB)`);
          continue;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          toast.error(`${file.name}: maior que ${MAX_MB}MB`);
          continue;
        }
        accepted.push({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
          title: prettyTitle(file.name) || file.name,
          author: "",
          pages: 0,
          coverBlob: null,
          status: "pending",
          progress: 0,
        });
      }
      if (!accepted.length) return;
      setItems((prev) => [...prev, ...accepted]);

      // Extrai metadados dos PDFs em segundo plano (sequencial p/ não travar a UI).
      (async () => {
        for (const item of accepted) {
          if (!item.file.name.toLowerCase().endsWith(".pdf")) continue;
          patch(item.id, { status: "analyzing" });
          try {
            const meta = await extractPdfMetadata(item.file);
            patch(item.id, {
              status: "pending",
              pages: meta.totalPages,
              coverBlob: meta.coverBlob,
              title: meta.title || item.title,
              author: meta.author || "",
            });
          } catch {
            patch(item.id, { status: "pending" });
          }
        }
      })();
    },
    [patch],
  );

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function close() {
    if (running) return;
    setItems([]);
    setCategory("");
    onOpenChange(false);
  }

  async function startUpload() {
    const queue = items.filter((it) => it.status !== "done");
    if (!queue.length) {
      toast.error("Selecione ao menos um arquivo");
      return;
    }
    setRunning(true);
    let ok = 0;
    let fail = 0;
    for (const item of queue) {
      try {
        patch(item.id, { status: "uploading", progress: 15, error: undefined });
        const path = await libraryService.uploadFile(userId, item.file);
        patch(item.id, { progress: 65 });

        let coverPath: string | null = null;
        if (item.coverBlob) {
          try {
            coverPath = await libraryService.uploadCover(userId, item.coverBlob);
          } catch {
            /* capa é opcional */
          }
        }
        patch(item.id, { progress: 85 });

        await onCreate({
          title: item.title.trim() || prettyTitle(item.file.name),
          author: item.author.trim() || null,
          category: category.trim() || null,
          file_path: path,
          file_size: item.file.size,
          cover_path: coverPath,
          total_pages: item.pages || 0,
          status: "to-read",
        });
        patch(item.id, { status: "done", progress: 100 });
        ok++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha no envio";
        patch(item.id, { status: "error", progress: 0, error: msg });
        fail++;
      }
    }
    setRunning(false);
    if (ok) toast.success(`${ok} livro(s) enviado(s) com sucesso`);
    if (fail) toast.error(`${fail} envio(s) falharam`);
    if (!fail) {
      setItems([]);
      setCategory("");
      onOpenChange(false);
    }
  }

  const totalReady = items.filter((i) => i.status !== "done").length;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar livros</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
            )}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Arraste arquivos aqui ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF ou EPUB · até {MAX_MB}MB por arquivo · vários de uma vez
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.epub,application/pdf,application/epub+zip"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria para este envio</Label>
            <Input
              list="upload-batch-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Direito, TI, Idiomas... (opcional)"
              disabled={running}
            />
            <datalist id="upload-batch-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {items.length > 0 && (
            <div className="max-h-[300px] overflow-auto space-y-2 pr-1">
              {items.map((it) => (
                <div key={it.id} className="border border-border p-3 flex gap-3 items-start">
                  <div className="mt-1 shrink-0">
                    {it.status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : it.status === "error" ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : it.status === "analyzing" || it.status === "uploading" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={it.title}
                      onChange={(e) => patch(it.id, { title: e.target.value })}
                      className="h-8 text-sm"
                      disabled={running}
                      placeholder="Título"
                    />
                    <Input
                      value={it.author}
                      onChange={(e) => patch(it.id, { author: e.target.value })}
                      className="h-8 text-xs"
                      disabled={running}
                      placeholder="Autor (opcional)"
                    />
                    <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                      <span className="truncate max-w-[55vw] sm:max-w-[220px]">{it.file.name}</span>
                      <span>· {formatSize(it.file.size)}</span>
                      {it.pages > 0 && (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Sparkles className="h-3 w-3" />
                          {it.pages} págs.{it.coverBlob ? " · capa pronta" : ""}
                        </span>
                      )}
                      {it.status === "analyzing" && <span>lendo metadados…</span>}
                      {it.error && <span className="text-destructive">{it.error}</span>}
                    </p>
                    {(it.status === "uploading" || it.status === "done") && (
                      <Progress value={it.progress} className="h-1" />
                    )}
                  </div>
                  {!running && (
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label="Remover da fila"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={running}>
            Cancelar
          </Button>
          <Button onClick={startUpload} disabled={running || totalReady === 0} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Enviar {totalReady > 0 ? `(${totalReady})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}