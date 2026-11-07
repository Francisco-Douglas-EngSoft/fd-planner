/**
 * Painel de coleções na biblioteca.
 * Permite criar, renomear, colorir e atribuir livros a coleções.
 */
import { useState } from "react";
import {
  BookMarked,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useCollections } from "@/hooks/useCollections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  activeCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
}

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6",
];

export function CollectionsPanel({ activeCollectionId, onSelectCollection }: Props) {
  const { data: collections = [], create, update, remove, isLoading } = useCollections();
  const [expanded, setExpanded] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await create.mutateAsync({ name: newName.trim(), color: newColor });
      setNewName("");
      setCreating(false);
      toast.success("Coleção criada");
    } catch {
      toast.error("Erro ao criar coleção");
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    try {
      await update.mutateAsync({ id, patch: { name: editName.trim() } });
      setEditing(null);
    } catch {
      toast.error("Erro ao renomear");
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remover esta coleção? Os livros não serão excluídos.")) return;
    try {
      await remove.mutateAsync(id);
      if (activeCollectionId === id) onSelectCollection(null);
      toast.success("Coleção removida");
    } catch {
      toast.error("Erro ao remover coleção");
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground font-semibold"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Coleções
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => setCreating((v) => !v)}
          aria-label="Nova coleção"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {creating && (
        <div className="px-1 space-y-2 pt-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da coleção"
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <div className="flex gap-1 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => setNewColor(c)}
                className={cn(
                  "w-5 h-5 rounded-full border-2 transition-transform",
                  newColor === c ? "border-foreground scale-110" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <Button size="sm" className="h-7 flex-1 text-xs" onClick={handleCreate} disabled={!newName.trim() || create.isPending}>
              {create.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              Criar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCreating(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 -mx-3 px-3 lg:mx-0 lg:px-0 scrollbar-none">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 py-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
            </div>
          ) : collections.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-1">Nenhuma coleção ainda.</p>
          ) : (
            collections.map((col) => (
              <div key={col.id} className="group flex items-center">
                {editing === col.id ? (
                  <div className="flex gap-1 w-full px-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-xs flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(col.id);
                        if (e.key === "Escape") setEditing(null);
                      }}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRename(col.id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectCollection(activeCollectionId === col.id ? null : col.id)}
                    className={cn(
                      "flex-1 flex items-center justify-between gap-2 px-3 py-2 text-sm border transition-colors shrink-0 lg:w-full text-left",
                      activeCollectionId === col.id
                        ? "bg-primary/10 border-primary/40 text-primary font-medium"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: col.color ?? "#6366f1" }}
                      />
                      <span className="truncate">{col.name}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {col.book_count}
                      </Badge>
                      <span className="hidden group-hover:flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(col.id);
                            setEditName(col.name);
                          }}
                          aria-label="Renomear"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(col.id);
                          }}
                          aria-label="Remover"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </span>
                    </span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
