/**
 * Barra de ações em lote para a biblioteca.
 * Aparece quando um ou mais livros estão selecionados.
 */
import { Trash2, FolderOpen, Download, X, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  selectedCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onBatchDelete: () => void;
  onBatchAddToCollection: () => void;
  onBatchExport?: () => void;
  isDeleting?: boolean;
}

export function BatchActionsBar({
  selectedCount,
  onClearSelection,
  onSelectAll,
  onBatchDelete,
  onBatchAddToCollection,
  onBatchExport,
  isDeleting,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Ações em lote"
      className="sticky top-0 z-20 flex items-center gap-2 flex-wrap bg-primary text-primary-foreground px-4 py-2.5 shadow-md rounded-lg animate-in slide-in-from-top-2"
    >
      <button
        type="button"
        onClick={onClearSelection}
        aria-label="Cancelar seleção"
        className="p-1 hover:bg-primary-foreground/20 rounded"
      >
        <X className="h-4 w-4" />
      </button>

      <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 font-bold">
        {selectedCount} selecionados
      </Badge>

      <div className="flex gap-2 ml-auto flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-primary-foreground hover:bg-primary-foreground/20 gap-1.5 text-xs"
          onClick={onSelectAll}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Selecionar todos</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-primary-foreground hover:bg-primary-foreground/20 gap-1.5 text-xs"
          onClick={onBatchAddToCollection}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Coleção</span>
        </Button>
        {onBatchExport && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-primary-foreground hover:bg-primary-foreground/20 gap-1.5 text-xs"
            onClick={onBatchExport}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-red-300 hover:bg-red-500/30 hover:text-red-200 gap-1.5 text-xs"
          onClick={onBatchDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Remover</span>
        </Button>
      </div>
    </div>
  );
}
