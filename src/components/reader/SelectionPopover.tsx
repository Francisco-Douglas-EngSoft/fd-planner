import { Highlighter, Underline, StickyNote, X } from "lucide-react";
import { HIGHLIGHT_COLORS } from "@/services/annotationsService";

interface Props {
  x: number; // px relativo ao container
  y: number;
  onSave: (color: string, kind: "highlight" | "underline", withNote: boolean) => void;
  onCancel: () => void;
}

export function SelectionPopover({ x, y, onSave, onCancel }: Readonly<Props>) {
  return (
    <div
      className="absolute z-30 flex items-center gap-1 bg-popover text-popover-foreground border border-border shadow-lg px-2 py-1"
      style={{ left: Math.max(4, x), top: Math.max(4, y - 44) }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {Object.entries(HIGHLIGHT_COLORS).map(([key, meta]) => (
        <button
          key={key}
          type="button"
          title={`Destacar em ${meta.label}`}
          onClick={() => onSave(key, "highlight", false)}
          className="w-5 h-5 border border-border/60 hover:scale-110 transition-transform"
          style={{ background: meta.bg }}
        />
      ))}
      <span className="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        title="Sublinhar"
        onClick={() => onSave("blue", "underline", false)}
        className="h-6 w-6 flex items-center justify-center hover:bg-muted"
      >
        <Underline className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Destacar + adicionar nota"
        onClick={() => onSave("yellow", "highlight", true)}
        className="h-6 w-6 flex items-center justify-center hover:bg-muted"
      >
        <StickyNote className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Fechar"
        onClick={onCancel}
        className="h-6 w-6 flex items-center justify-center hover:bg-muted text-muted-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <Highlighter className="h-3.5 w-3.5 text-muted-foreground ml-1" />
    </div>
  );
}
