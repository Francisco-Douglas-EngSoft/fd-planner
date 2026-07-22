import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

// Registra worker uma única vez (compartilhado com o Reader).
if (!(pdfjsLib as any).GlobalWorkerOptions.workerPort) {
  (pdfjsLib as any).GlobalWorkerOptions.workerPort = new PdfWorker();
}

export interface PdfMetadataResult {
  title: string | null;
  author: string | null;
  totalPages: number;
  coverBlob: Blob | null;
}

function cleanString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  // Ignora títulos genéricos do Word/exportadores.
  if (/^untitled/i.test(t) || /^microsoft word/i.test(t)) return null;
  return t;
}

/**
 * Extrai título, autor, total de páginas e uma imagem da 1ª página do PDF.
 */
export async function extractPdfMetadata(source: File | ArrayBuffer | Blob): Promise<PdfMetadataResult> {
  const buf =
    source instanceof ArrayBuffer
      ? source
      : await (source as Blob).arrayBuffer();

  const doc = await (pdfjsLib as any).getDocument({ data: buf }).promise;

  let title: string | null = null;
  let author: string | null = null;
  try {
    const meta = await doc.getMetadata();
    const info = (meta?.info ?? {}) as Record<string, unknown>;
    title = cleanString(info.Title);
    author = cleanString(info.Author);
  } catch {
    // metadados podem faltar
  }

  const totalPages: number = doc.numPages ?? 0;

  let coverBlob: Blob | null = null;
  try {
    const page = await doc.getPage(1);
    // Escala para capa nítida (~ 900px de largura).
    const baseViewport = page.getViewport({ scale: 1 });
    const targetWidth = 900;
    const scale = Math.min(3, targetWidth / baseViewport.width);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      await page.render({ canvasContext: ctx, viewport }).promise;
      coverBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82),
      );
    }
  } catch (err) {
    console.warn("[pdfMetadata] falha ao renderizar capa", err);
  }

  try {
    await doc.destroy();
  } catch {
    /* noop */
  }

  return { title, author, totalPages, coverBlob };
}
