const ts = require('typescript');
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '../../src');
const OUT = process.env.I18N_WORK || '/tmp/i18n';
fs.mkdirSync(OUT, { recursive: true });
const files = [];
(function walk(d){ for (const f of fs.readdirSync(d)) { const p = path.join(d,f); const st = fs.statSync(p);
  if (st.isDirectory()) { if (['__tests__','integrations','test'].includes(f)) continue; walk(p); }
  else if (/\.(tsx?|)$/.test(f) && !/\.test\./.test(f) && !/\.d\.ts$/.test(f)) files.push(p); } })(ROOT);
const pairs = new Map();   // pt -> en from existing t()/tr()
const strings = new Map(); // pt -> count
const SKIP_ATTR = new Set(['className','class','key','id','href','to','src','type','variant','size','name','htmlFor','role','value','defaultValue','data-testid','align','side','orientation','dataKey','stroke','fill','autoComplete','inputMode','accept','target','rel','method','path','element','queryKey','fontFamily','format','lang','dir','tabIndex','mode','layout','position','asChild','loading','decoding','sizes','srcSet','style','viewBox','d','xmlns','strokeLinecap','strokeLinejoin','color','icon','iconName','pattern','min','max','step']);
const norm = s => s.replace(/\s+/g,' ').trim();
const looksText = s => {
  if (!/[A-Za-zÀ-ú]/.test(s)) return false;
  if (s.length < 2) return false;
  if (/^(https?:|mailto:|\/|\.\/|@\/|#|data:|rgb|hsl|var\()/.test(s)) return false;
  if (/^[a-z0-9_.\-:\/\[\]%#()=&!>~*,+]+$/.test(s) && !/[à-ú]/.test(s)) { // lowercase token-ish
    if (!/\s/.test(s)) return false; // single token like 'reading', 'to_read'
    if (/(^|\s)(flex|grid|text-|bg-|border|px-|py-|p-|m-|w-|h-|gap-|rounded|items-|justify-|hover:|sm:|md:|lg:|xl:)/.test(s)) return false;
  }
  if (/^[A-Z0-9_]+$/.test(s)) return false; // CONSTANTS
  if (/^[a-z]+[A-Z][A-Za-z]+$/.test(s)) return false; // camelCase
  if (/^(select|insert|update|delete)\b/i.test(s) && /\b(from|into|set)\b/i.test(s)) return false;
  if (/\b(id|user_id|created_at)\b,/.test(s)) return false; // select column lists
  return true;
};
const add = s => { s = norm(s); if (looksText(s)) strings.set(s, (strings.get(s)||0)+1); };
function tplPattern(node){ // TemplateExpression -> "a {0} b"
  let out = node.head.text; node.templateSpans.forEach((sp,i)=>{ out += `{${i}}` + sp.literal.text; }); return out; }
function strOf(n){ if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text; if (ts.isTemplateExpression(n)) return tplPattern(n); return null; }
for (const f of files) {
  if (f.includes('/i18n/')) continue;
  const src = fs.readFileSync(f,'utf8');
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  (function visit(n, inSkip){
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    if (ts.isCallExpression(n)) {
      const callee = n.expression.getText(sf);
      if ((/(^|\.)t$/.test(callee) || callee==='tr') && n.arguments.length>=2) {
        const a = strOf(n.arguments[0]), b = strOf(n.arguments[1]);
        if (a!=null && b!=null) { pairs.set(norm(a), norm(b)); return; }
      }
      if (/^(console\.|supabase\.from|\.from|\.select|\.eq|\.order|localStorage|sessionStorage|new URL|fetch|import)/.test(callee) || /\.(select|eq|from|order|rpc|getItem|setItem|removeItem|channel|invoke|neq|in|is|gte|lte|ilike|or|match)$/.test(callee) || /^console/.test(callee)) {
        // still visit non-literal args (callbacks)
        n.arguments.forEach(a=>{ if(!strOf(a)) visit(a,false); }); visit(n.expression,false); return; }
    }
    if (ts.isJsxAttribute(n)) { const name = n.name.getText(sf); if (SKIP_ATTR.has(name) || /^on[A-Z]/.test(name)) { if (n.initializer && ts.isJsxExpression(n.initializer)) { const e=n.initializer.expression; if (e && !strOf(e)) visit(e,true);} return; } }
    if (ts.isJsxText(n)) { add(n.text); return; }
    if (ts.isPropertyAssignment(n)) { const k = n.name.getText(sf).replace(/['"]/g,''); if (['className','queryKey','value','id','key','path','to','href','icon','type','status','variant','color','bucket','table','dataKey','storageKey'].includes(k) && strOf(n.initializer)) return; }
    if (ts.isElementAccessExpression(n)) return;
    if (ts.isBinaryExpression(n) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(n.operatorToken.kind)) return;
    if (ts.isCaseClause(n)) { n.statements.forEach(s=>visit(s,false)); return; }
    if (ts.isTypeNode && (ts.isLiteralTypeNode(n) || ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n))) return;
    const s = strOf(n); if (s!=null) { if (!inSkip) add(s); else if (/\s/.test(s) && /[A-ZÀ-ú]/.test(s)) {} return; }
    ts.forEachChild(n, c=>visit(c, inSkip));
  })(sf,false);
}
const out = [...strings.keys()].filter(s=>!pairs.has(s));
fs.writeFileSync(OUT + '/strings.json', JSON.stringify(out,null,1));
fs.writeFileSync(OUT + '/pairs.json', JSON.stringify(Object.fromEntries(pairs),null,1));
console.log('files',files.length,'pairs',pairs.size,'strings',out.length, 'chars', out.join('').length);
