/** Utilitários de data/hora do módulo Rotina (sempre no fuso local, formato brasileiro). */

const pad = (n: number) => String(n).padStart(2, '0');

export function paraISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function deISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function hojeISO(agora: Date = new Date()): string {
  return paraISO(agora);
}

export function somarDias(iso: string, dias: number): string {
  const d = deISO(iso);
  d.setDate(d.getDate() + dias);
  return paraISO(d);
}

/** Lista de dias de `de` até `ate`, inclusive. */
export function intervaloDias(de: string, ate: string): string[] {
  const dias: string[] = [];
  let atual = de;
  for (let i = 0; atual <= ate && i < 4000; i++) {
    dias.push(atual);
    atual = somarDias(atual, 1);
  }
  return dias;
}

export function diaDaSemana(iso: string): number {
  return deISO(iso).getDay();
}

/** Data local (AAAA-MM-DD) de um timestamp ISO. */
export function dataLocalDeTimestamp(ts: string): string {
  return paraISO(new Date(ts));
}

export function horaAtualHHMM(agora: Date = new Date()): string {
  return `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
}

export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** "04:00:00" → "04:00" */
export function normalizarHora(hora: string): string {
  return hora.slice(0, 5);
}

export function formatarDataBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatarDiaMes(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function formatarDataHoraBR(ts: string): string {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const DIAS_SEMANA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DIAS_SEMANA_LETRA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const DIAS_SEMANA_NOME = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export function formatarDataExtenso(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(deISO(iso));
}

/** 35 → "35 min"; 100 → "1h40"; 120 → "2h" */
export function formatarDuracao(min: number | null | undefined): string {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}

/** Tempo relativo curto: 80 → "1h 20min" */
export function formatarIntervalo(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}
