import fs from 'fs';
const WORK = process.env.I18N_WORK || '/tmp/i18n';
const strings = JSON.parse(fs.readFileSync(WORK + '/strings.json','utf8'));
const pairs = JSON.parse(fs.readFileSync(WORK + '/pairs.json','utf8'));
const outPath = WORK + '/translated.json';
const done = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath,'utf8')) : {};
const todo = strings.filter(s => !(s in done));
const glossary = Object.entries(pairs).filter(([a,b]) => a.length < 40 && a !== b).slice(0, 220).map(([a,b]) => `${a} => ${b}`).join('\n');
const SYS = `You translate UI strings of "FD-Planner", a Brazilian study-planning web app (courses, modules, study plans, focus/pomodoro, tasks, daily routine, notes, digital library/reader, AI assistant, achievements, an addiction-control module called AntiVício -> "Habit Control"), from Brazilian Portuguese to natural, concise US English for a professional product UI.
Rules:
- Return ONLY a JSON object mapping each input index (string key) to its English translation.
- Keep placeholders like {0}, {1} exactly, and keep emojis, symbols, punctuation, leading/trailing spaces and capitalization style (Title Case stays Title Case, short labels stay short).
- If a string is code, a CSS class list, an identifier, a file name pattern, a date-fns format token string (e.g. "EEEE, dd/MM"), a brand/proper name, or already English, return it unchanged.
- Translate names of famous quotes' authors only if they have a common English form; translate the quote text itself.
- Use this glossary for consistency:
${glossary}`;
async function call(batch) {
  const input = Object.fromEntries(batch.map((s,i)=>[String(i), s]));
  for (let attempt=0; attempt<4; attempt++) {
    try {
      const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${process.env.LOVABLE_API_KEY}`},
        body: JSON.stringify({ model:'google/gemini-3.8-flash', response_format:{type:'json_object'},
          messages:[{role:'system',content:SYS},{role:'user',content:JSON.stringify(input)}] })});
      if (!r.ok) { const t = await r.text(); throw new Error(r.status+' '+t.slice(0,200)); }
      const j = await r.json();
      let c = j.choices[0].message.content.trim().replace(/^```json\s*|```$/g,'');
      const obj = JSON.parse(c);
      const res = {};
      batch.forEach((s,i)=>{ const v = obj[String(i)]; if (typeof v === 'string' && v.trim()) res[s]=v; });
      return res;
    } catch (e) { console.error('retry', attempt, String(e).slice(0,200)); await new Promise(r=>setTimeout(r, 2000*(attempt+1))); }
  }
  return {};
}
const SIZE = 100, CONC = 3;
const batches = []; for (let i=0;i<todo.length;i+=SIZE) batches.push(todo.slice(i,i+SIZE));
let idx = 0;
async function worker(){ while (idx < batches.length) { const b = batches[idx++]; const res = await call(b); Object.assign(done,res); fs.writeFileSync(outPath, JSON.stringify(done,null,1)); process.stdout.write(`.${Object.keys(done).length}`); } }
await Promise.all(Array.from({length:CONC}, worker));
console.log('\ntranslated', Object.keys(done).length, 'of', strings.length);
