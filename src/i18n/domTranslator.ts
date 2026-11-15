/**
 * Traduz a interface já desenhada na tela quando o idioma é inglês.
 *
 * Observa a página (textos, placeholder, title, aria-label, alt) e troca cada frase em português
 * pela versão do dicionário. Ao voltar para português, restaura o texto original.
 * Nunca mexe em conteúdo do usuário em edição: campos de texto, editores (contenteditable /
 * ProseMirror), leitor de livros e qualquer área com `translate="no"` ou `data-no-translate`.
 */
import type { Dictionary } from './translateText';
import { createTranslator } from './translateText';

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const SKIP_SELECTOR =
  'script,style,noscript,textarea,code,pre,iframe,[contenteditable=""],[contenteditable="true"],.ProseMirror,[translate="no"],[data-no-translate],.epub-container,.textLayer,.pdf-text-layer';

type Rec = { orig: string; out: string };
const textRecs = new WeakMap<Text, Rec>();
const attrRecs = new WeakMap<Element, Map<string, Rec>>();

let translate: ((s: string) => string | null) | null = null;
let observer: MutationObserver | null = null;
let titleRec: Rec | null = null;
let dictPromise: Promise<Dictionary> | null = null;

export function loadDictionary() {
  dictPromise ??= import('./dictionary.en.json').then((m) => (m.default ?? m) as unknown as Dictionary);
  return dictPromise;
}

function skipped(el: Element | null) {
  return !el || !!el.closest(SKIP_SELECTOR);
}

function doText(node: Text) {
  if (!translate) return;
  const value = node.nodeValue ?? '';
  const rec = textRecs.get(node);
  if (rec && value === rec.out) return;
  if (skipped(node.parentElement)) return;
  const en = translate(value);
  if (en === null || en === value) {
    textRecs.delete(node);
    return;
  }
  textRecs.set(node, { orig: value, out: en });
  node.nodeValue = en;
}

function doAttrs(el: Element) {
  if (!translate) return;
  let recs = attrRecs.get(el);
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const rec = recs?.get(a);
    if (rec && v === rec.out) continue;
    if (skipped(el) && a !== 'aria-label' && a !== 'title') continue;
    const en = translate(v);
    if (en === null || en === v) continue;
    recs ??= new Map();
    recs.set(a, { orig: v, out: en });
    attrRecs.set(el, recs);
    el.setAttribute(a, en);
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    doText(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (el.matches?.('script,style,noscript')) return;
    doAttrs(el);
  }
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = tw.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
    else doAttrs(n as Element);
    n = tw.nextNode();
  }
}

function doTitle() {
  if (!translate) return;
  const v = document.title;
  if (titleRec && v === titleRec.out) return;
  const en = translate(v);
  if (en && en !== v) {
    titleRec = { orig: v, out: en };
    document.title = en;
  }
}

export async function startDomTranslation() {
  const dict = await loadDictionary();
  translate ??= createTranslator(dict);
  if (observer) return;
  walk(document.body);
  doTitle();
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') doText(m.target as Text);
      else if (m.type === 'attributes') doAttrs(m.target as Element);
      else m.addedNodes.forEach((n) => walk(n));
    }
    doTitle();
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });
  const head = document.querySelector('title');
  if (head) observer.observe(head, { childList: true, characterData: true, subtree: true });
}

export function stopDomTranslation() {
  observer?.disconnect();
  observer = null;
  if (typeof document === 'undefined') return;
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = tw.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n as Text;
      const rec = textRecs.get(t);
      if (rec && t.nodeValue === rec.out) t.nodeValue = rec.orig;
      textRecs.delete(t);
    } else {
      const el = n as Element;
      const recs = attrRecs.get(el);
      recs?.forEach((rec, a) => {
        if (el.getAttribute(a) === rec.out) el.setAttribute(a, rec.orig);
      });
      attrRecs.delete(el);
    }
    n = tw.nextNode();
  }
  if (titleRec && document.title === titleRec.out) document.title = titleRec.orig;
  titleRec = null;
}
