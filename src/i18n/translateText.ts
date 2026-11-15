/**
 * Tradução de textos da interface (português → inglês) a partir do dicionário gerado
 * (`dictionary.en.json`). Regras, em ordem:
 *  1. frase exata (espaços extras ignorados, espaços das pontas preservados);
 *  2. a mesma frase sem ":" / "..." / "…" final;
 *  3. modelos com valores variáveis ("em {0} dias" → "in {0} days");
 *  4. datas por extenso ("15 de novembro", "segunda-feira").
 * Sem correspondência, o texto fica como está.
 */
export interface Dictionary {
  exact: Record<string, string>;
  patterns: Record<string, string>;
}

const MONTHS_FULL: Record<string, string> = {
  janeiro: 'January', fevereiro: 'February', 'março': 'March', marco: 'March', abril: 'April', maio: 'May',
  junho: 'June', julho: 'July', agosto: 'August', setembro: 'September', outubro: 'October',
  novembro: 'November', dezembro: 'December',
};
const MONTHS_SHORT: Record<string, string> = {
  jan: 'Jan', fev: 'Feb', mar: 'Mar', abr: 'Apr', mai: 'May', jun: 'Jun', jul: 'Jul', ago: 'Aug',
  set: 'Sep', out: 'Oct', nov: 'Nov', dez: 'Dec',
};
const WEEKDAYS: Record<string, string> = {
  domingo: 'Sunday', 'segunda-feira': 'Monday', 'terça-feira': 'Tuesday', 'quarta-feira': 'Wednesday',
  'quinta-feira': 'Thursday', 'sexta-feira': 'Friday', 'sábado': 'Saturday',
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function keepCase(source: string, target: string) {
  if (source === source.toUpperCase() && source !== source.toLowerCase()) return target.toUpperCase();
  return target;
}

const FULL_DATE = new RegExp(
  `\\b(\\d{1,2}) de (${Object.keys(MONTHS_FULL).join('|')})(?: de (\\d{4}))?`,
  'gi',
);
const SHORT_DATE = new RegExp(`\\b(\\d{1,2})(?: de)? (${Object.keys(MONTHS_SHORT).join('|')})\\.?(?= |,|$)(?: de (\\d{4}))?`, 'gi');
const WEEKDAY_RE = new RegExp(`(^|[^A-Za-zÀ-ú])(${Object.keys(WEEKDAYS).join('|')})(?![A-Za-zÀ-ú])`, 'gi');

export function translateDates(text: string): string {
  let out = text.replace(FULL_DATE, (m, d, mon, y) => {
    const en = keepCase(mon, MONTHS_FULL[mon.toLowerCase()]);
    return `${en} ${Number(d)}${y ? `, ${y}` : ''}`;
  });
  out = out.replace(SHORT_DATE, (m, d, mon, y) => {
    const en = keepCase(mon, MONTHS_SHORT[mon.toLowerCase()]);
    return `${en} ${Number(d)}${y ? `, ${y}` : ''}`;
  });
  out = out.replace(WEEKDAY_RE, (m, pre, wd) => `${pre}${keepCase(wd, WEEKDAYS[wd.toLowerCase()])}`);
  return out;
}

interface CompiledPattern {
  re: RegExp;
  en: string;
  anchor: string;
  order: number[];
}

export function createTranslator(dict: Dictionary) {
  const exact = new Map<string, string>(Object.entries(dict.exact));
  const lowerExact = new Map<string, string>();
  for (const [k, v] of exact) if (!lowerExact.has(k.toLowerCase())) lowerExact.set(k.toLowerCase(), v);

  const compiled: CompiledPattern[] = Object.entries(dict.patterns)
    .map(([pt, en]) => {
      const order: number[] = [];
      const parts = pt.split(/(\{\d+\})/);
      let src = '^';
      let anchor = '';
      for (const p of parts) {
        const ph = p.match(/^\{(\d+)\}$/);
        if (ph) {
          order.push(Number(ph[1]));
          src += '(.+?)';
        } else {
          src += escapeRe(p);
          if (p.trim().length > anchor.length) anchor = p.trim();
        }
      }
      return { re: new RegExp(`${src}$`, 's'), en, anchor, order };
    })
    .sort((a, b) => b.anchor.length - a.anchor.length);

  const memo = new Map<string, string | null>();

  const lookup = (key: string): string | null => {
    const hit = exact.get(key);
    if (hit !== undefined) return hit;
    // "Salvar:" / "Carregando..." / "Carregando…"
    const m = key.match(/^(.*?)(:|\.\.\.|…)$/s);
    if (m && m[1]) {
      const base = exact.get(m[1].trim());
      if (base !== undefined) return base + m[2];
    }
    for (const p of compiled) {
      if (p.anchor && !key.includes(p.anchor)) continue;
      const mm = key.match(p.re);
      if (!mm) continue;
      const values: string[] = [];
      p.order.forEach((idx, i) => {
        const v = mm[i + 1];
        values[idx] = exact.get(v.trim()) ?? v;
      });
      return p.en.replace(/\{(\d+)\}/g, (_, n) => values[Number(n)] ?? '');
    }
    return null;
  };

  /** Devolve o texto em inglês, ou null quando não há tradução. */
  return function translate(text: string): string | null {
    if (!text) return null;
    const key = text.replace(/\s+/g, ' ').trim();
    if (!key || !/[A-Za-zÀ-ú]/.test(key)) return null;
    if (memo.has(key)) {
      const v = memo.get(key)!;
      return v === null ? null : wrap(text, v);
    }
    let res = lookup(key);
    if (res === null) {
      const dated = translateDates(key);
      if (dated !== key) res = lookup(dated) ?? dated;
    }
    // "Pomodoro Clássico · 25/5 min": traduz cada parte separada por " · " / " — " / " | ".
    if (res === null && /\s[·—|]\s/.test(key)) {
      const parts = key.split(/(\s[·—|]\s)/);
      let changed = false;
      const out = parts.map((part, i) => {
        if (i % 2 === 1) return part;
        const v = lookup(part.trim());
        if (v !== null) changed = true;
        return v ?? part;
      });
      if (changed) res = out.join('');
    }
    if (res === null && key.length <= 40) {
      const ci = lowerExact.get(key.toLowerCase());
      if (ci !== undefined) res = keepCase(key, ci);
    }
    if (memo.size > 20000) memo.clear();
    memo.set(key, res);
    return res === null ? null : wrap(text, res);
  };
}

function wrap(original: string, translated: string) {
  const lead = original.match(/^\s*/)?.[0] ?? '';
  const trail = original.match(/\s*$/)?.[0] ?? '';
  return lead + translated + trail;
}
