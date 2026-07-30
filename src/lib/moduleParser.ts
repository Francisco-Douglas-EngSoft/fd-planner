/**
 * Parser de módulos colados da internet (texto livre).
 * Detecta hierarquia (módulo / submódulo) e duração em vários formatos.
 */

export interface ParsedSubModule {
  name: string;
  hours: number;
}

export interface ParsedModule {
  name: string;
  hours: number;
  subModules: ParsedSubModule[];
}

const DEFAULT_MODULE_HOURS = 1;
const DEFAULT_SUB_HOURS = 0.5;

/** Extrai duração (em horas) de um texto e devolve o texto sem a duração. */
export function extractDuration(raw: string): { text: string; hours: number | null } {
  let text = raw;
  let hours: number | null = null;

  const patterns: { re: RegExp; calc: (m: RegExpMatchArray) => number }[] = [
    // 01:30:00 ou 1:30
    {
      re: /\(?\b(\d{1,3}):([0-5]?\d)(?::([0-5]?\d))?\b\)?/,
      calc: (m) => Number(m[1]) + Number(m[2]) / 60 + (m[3] ? Number(m[3]) / 60 / 60 : 0),
    },
    // 1h30, 1 h 30 min, 2hrs
    {
      re: /\b(\d{1,3})\s*(?:h|hr|hrs|hora|horas)\b\s*(?:(\d{1,2})\s*(?:m|min|mins|minuto|minutos)?)?/i,
      calc: (m) => Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0),
    },
    // 45 min
    { re: /\b(\d{1,4})\s*(?:m|min|mins|minuto|minutos)\b/i, calc: (m) => Number(m[1]) / 60 },
    // 90 segundos / 90s
    { re: /\b(\d{1,5})\s*(?:s|seg|segs|segundo|segundos)\b/i, calc: (m) => Number(m[1]) / 3600 },
  ];

  for (const { re, calc } of patterns) {
    const m = text.match(re);
    if (m) {
      const value = calc(m);
      if (value > 0) {
        hours = value;
        text = text.replace(m[0], ' ');
        break;
      }
    }
  }

  return { text, hours };
}

/** Limpa marcadores, numeração e sujeira comum de sites de curso. */
function cleanName(raw: string): string {
  return raw
    .replace(/^[\s\t]*[-–—•*·▪●○►▶>]+\s*/, '')
    .replace(/^\s*(?:m[óo]dulo|modulo|aula|cap[íi]tulo|se[çc][ãa]o|se[cç]ao|unidade|lesson|section|module|chapter|parte)\s*[:\-–.]?\s*/i, '')
    .replace(/^\s*\d{1,3}\s*[).:\-–]\s*/, '')
    .replace(/^\s*\d{1,3}(?:\.\d{1,3})+\s*[).:\-–]?\s*/, '')
    .replace(/\s*[|·–-]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Detecta o nível hierárquico de uma linha (0 = módulo, 1 = submódulo). */
function detectLevel(rawLine: string): number {
  const indentMatch = rawLine.match(/^[\t ]*/)?.[0] ?? '';
  const indent = indentMatch.replace(/\t/g, '    ').length;

  // Numeração 1.1 / 2.3.1 => submódulo
  if (/^\s*\d{1,3}\.\d{1,3}/.test(rawLine)) return 1;

  // Cabeçalho explícito de módulo => nível 0
  if (/^\s*(?:m[óo]dulo|modulo|module|se[çc][ãa]o|section|unidade|cap[íi]tulo|chapter)\b/i.test(rawLine)) return 0;

  if (indent >= 2) return 1;

  // Marcadores de lista costumam ser aulas dentro de um módulo
  if (/^\s*[-–—•*·▪●○►▶>]\s+/.test(rawLine)) return 1;

  return 0;
}

export interface ParseOptions {
  /** Trata todas as linhas como módulos, sem submódulos. */
  flat?: boolean;
  defaultModuleHours?: number;
  defaultSubHours?: number;
}

export function parseModulesText(input: string, options: ParseOptions = {}): ParsedModule[] {
  const {
    flat = false,
    defaultModuleHours = DEFAULT_MODULE_HOURS,
    defaultSubHours = DEFAULT_SUB_HOURS,
  } = options;

  const lines = (input || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  const modules: ParsedModule[] = [];

  for (const line of lines) {
    const { text, hours } = extractDuration(line);
    const name = cleanName(text);
    if (!name || name.length < 2) continue;
    // Ignora linhas de ruído comum
    if (/^(?:conte[úu]do do curso|curr[íi]culo|ementa|carga hor[áa]ria)\b/i.test(name)) continue;

    const level = flat ? 0 : detectLevel(line);

    if (level === 1 && modules.length > 0) {
      modules[modules.length - 1].subModules.push({
        name,
        hours: hours ?? defaultSubHours,
      });
    } else {
      modules.push({
        name,
        hours: hours ?? defaultModuleHours,
        subModules: [],
      });
    }
  }

  // Módulos com submódulos têm a carga somada a partir dos filhos
  return modules.map((m) =>
    m.subModules.length > 0
      ? { ...m, hours: m.subModules.reduce((sum, s) => sum + s.hours, 0) }
      : m,
  );
}