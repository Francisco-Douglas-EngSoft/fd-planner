import { useEffect, useRef } from "react";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewport: any;
  onReady?: (el: HTMLDivElement) => void;
}

/**
 * Overlay transparente com o texto do PDF para permitir seleção nativa do usuário.
 * Usa a API TextLayer moderna do pdfjs-dist (fallback para renderTextLayer legado).
 */
export function PdfTextLayer({ page, viewport, onReady }: Readonly<Props>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !page || !viewport) return;
    let cancelled = false;
    container.innerHTML = "";
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;
    // CSS custom prop usada pelo pdfjs textLayer para escala interna
    container.style.setProperty("--scale-factor", String(viewport.scale));

    (async () => {
      try {
        const textContent = await page.getTextContent();
        if (cancelled) return;
        // pdfjs v4+: classe TextLayer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod: any = await import("pdfjs-dist");
        if (mod.TextLayer) {
          const tl = new mod.TextLayer({
            textContentSource: textContent,
            container,
            viewport,
          });
          await tl.render();
        } else if (mod.renderTextLayer) {
          await mod.renderTextLayer({
            textContentSource: textContent,
            container,
            viewport,
          }).promise;
        }
        if (!cancelled && onReady) onReady(container);
      } catch (err) {
        console.warn("[TextLayer] render failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, viewport, onReady]);

  return (
    <div
      ref={containerRef}
      className="pdf-text-layer absolute inset-0 pointer-events-auto select-text"
      style={{
        color: "transparent",
        opacity: 1,
        lineHeight: 1,
      }}
    />
  );
}
