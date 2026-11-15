/**
 * Junta as traduções em src/i18n/dictionary.en.json.
 * Fluxo: node scripts/i18n/extract.cjs → node scripts/i18n/translate.mjs → node scripts/i18n/build-dictionary.mjs
 * Traduções já existentes no dicionário são mantidas (só textos novos são traduzidos).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const WORK = process.env.I18N_WORK || '/tmp/i18n';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../../src/i18n/dictionary.en.json');
const prev = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : { exact: {}, patterns: {} };
const pairs = JSON.parse(fs.readFileSync(WORK + '/pairs.json', 'utf8'));
const translated = fs.existsSync(WORK + '/translated.json') ? JSON.parse(fs.readFileSync(WORK + '/translated.json', 'utf8')) : {};
const exact = { ...prev.exact }, patterns = { ...prev.patterns };
const put = (pt, en) => {
  if (!pt || !en || pt === en) return;
  if (/\{\d+\}/.test(pt)) {
    const literal = pt.replace(/\{\d+\}/g, '').replace(/[^A-Za-zÀ-ú]/g, '');
    if (literal.length < 3) return;
    patterns[pt] ??= en;
  } else exact[pt] ??= en;
};
// t('pt','en') já escritos no código têm prioridade.
for (const [pt, en] of Object.entries(pairs)) { if (!/\{\d+\}/.test(pt)) exact[pt] = en; else patterns[pt] = en; }
for (const [pt, en] of Object.entries(translated)) put(pt, en);
const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(target, JSON.stringify({ exact: sortObj(exact), patterns: sortObj(patterns) }, null, 0));
console.log('exact', Object.keys(exact).length, 'patterns', Object.keys(patterns).length, 'bytes', fs.statSync(target).size);
