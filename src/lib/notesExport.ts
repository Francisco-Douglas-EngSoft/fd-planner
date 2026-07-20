import TurndownService from 'turndown';

/** Converte HTML de nota em Markdown. */
export function noteHtmlToMarkdown(html: string): string {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  td.addRule('taskItem', {
    filter: (node) =>
      node.nodeName === 'LI' && (node as HTMLElement).getAttribute('data-type') === 'taskItem',
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const checked = el.getAttribute('data-checked') === 'true';
      const text = el.textContent?.trim() ?? '';
      return `- [${checked ? 'x' : ' '}] ${text}\n`;
    },
  });
  return td.turndown(html || '');
}

/** Baixa um arquivo texto localmente. */
export function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Abre janela de impressão (usuário escolhe "Salvar como PDF"). */
export function printNote(title: string, html: string) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  const doc = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(
    title || 'Nota',
  )}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Inter, system-ui, sans-serif; color: #111; padding: 48px; line-height: 1.6; max-width: 780px; margin: 0 auto; }
    h1,h2,h3 { font-family: "Space Grotesk", Inter, sans-serif; margin: 1.2em 0 .5em; }
    h1 { font-size: 28px; } h2 { font-size: 22px; } h3 { font-size: 18px; }
    p { margin: .6em 0; }
    pre { background:#f4f4f5; padding:12px; overflow:auto; font-family: "JetBrains Mono", ui-monospace, monospace; font-size:13px; }
    code { background:#f4f4f5; padding:1px 4px; font-family: "JetBrains Mono", ui-monospace, monospace; font-size:.9em; }
    blockquote { border-left: 3px solid #d4d4d8; margin:1em 0; padding: .2em 1em; color:#52525b; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #d4d4d8; padding: 6px 10px; text-align: left; }
    th { background:#f4f4f5; }
    ul[data-type="taskList"] { list-style:none; padding-left:0; }
    ul[data-type="taskList"] li { display:flex; gap:.5em; align-items:flex-start; }
    ul[data-type="taskList"] li > label { margin-top: .25em; }
    hr { border: none; border-top:1px solid #e4e4e7; margin: 1.5em 0; }
    @media print { body { padding: 24px; } }
  </style></head><body><h1>${escapeHtml(title || 'Nota')}</h1>${html}
  <script>window.onload=()=>{setTimeout(()=>window.print(),200);};</script>
  </body></html>`;
  w.document.open();
  w.document.write(doc);
  w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

export interface NoteStats {
  words: number;
  chars: number;
  readingMinutes: number;
  headings: { level: number; text: string }[];
}

/** Computa contagens e sumário a partir do HTML. */
export function computeNoteStats(html: string): NoteStats {
  if (typeof window === 'undefined' || !html) {
    return { words: 0, chars: 0, readingMinutes: 0, headings: [] };
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  const headings = Array.from(doc.querySelectorAll('h1,h2,h3')).map((h) => ({
    level: Number(h.tagName.substring(1)),
    text: (h.textContent || '').trim(),
  }));
  return {
    words,
    chars: text.length,
    readingMinutes: Math.max(1, Math.round(words / 220)),
    headings,
  };
}