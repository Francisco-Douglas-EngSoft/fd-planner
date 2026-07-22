import { useMemo } from "react";
import type { Annotation } from "@/services/annotationsService";
import { HIGHLIGHT_COLORS } from "@/services/annotationsService";

interface Props {
  annotations: Annotation[];
  // dimensões CSS renderizadas da página atual
  renderedWidth: number;
  renderedHeight: number;
  onClick?: (a: Annotation) => void;
}

/**
 * Renderiza rects normalizados [0..1] sobre a página. Coordenadas independem
 * do zoom porque são armazenadas em fração do tamanho da página.
 */
export function HighlightsLayer({
  annotations,
  renderedWidth,
  renderedHeight,
  onClick,
}: Readonly<Props>) {
  const items = useMemo(() => {
    const out: Array<{ a: Annotation; style: React.CSSProperties }> = [];
    for (const a of annotations) {
      if (!a.rects) continue;
      for (const r of a.rects) {
        const color = HIGHLIGHT_COLORS[a.color]?.bg ?? HIGHLIGHT_COLORS.yellow.bg;
        const base: React.CSSProperties = {
          position: "absolute",
          left: `${r.x * renderedWidth}px`,
          top: `${r.y * renderedHeight}px`,
          width: `${r.w * renderedWidth}px`,
          height: `${r.h * renderedHeight}px`,
          cursor: onClick ? "pointer" : "default",
          pointerEvents: "auto",
        };
        if (a.kind === "underline") {
          out.push({
            a,
            style: {
              ...base,
              background: "transparent",
              borderBottom: `2px solid ${color.replace("0.42", "0.9")}`,
              height: `${r.h * renderedHeight}px`,
            },
          });
        } else {
          out.push({
            a,
            style: {
              ...base,
              background: color,
              mixBlendMode: "multiply",
            },
          });
        }
      }
    }
    return out;
  }, [annotations, renderedWidth, renderedHeight, onClick]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {items.map((it, i) => (
        <button
          key={`${it.a.id}-${i}`}
          type="button"
          aria-label={it.a.text ?? "Destaque"}
          style={it.style}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(it.a);
          }}
        />
      ))}
    </div>
  );
}
