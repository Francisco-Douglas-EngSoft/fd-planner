/**
 * Carregadores das telas (um arquivo por tela). O mesmo carregador é usado pelo
 * React.lazy e pelo pré-carregamento, então a tela baixada antes abre na hora.
 */
import type { ComponentType } from 'react';

type Carregador = () => Promise<{ default: ComponentType<unknown> }>;

export const telas = {
  '/': () => import('@/pages/LandingPage'),
  '/auth': () => import('@/pages/Auth'),
  '/dashboard': () => import('@/pages/Dashboard'),
  '/cursos': () => import('@/pages/Courses'),
  '/foco': () => import('@/pages/Focus'),
  '/tarefas': () => import('@/pages/Tasks'),
  '/planejamentos': () => import('@/pages/Planning'),
  '/relatorios': () => import('@/pages/Reports'),
  '/configuracoes': () => import('@/pages/Settings'),
  '/conquistas': () => import('@/pages/Achievements'),
  '/perfil': () => import('@/pages/Profile'),
  '/onboarding': () => import('@/pages/Onboarding'),
  '/antivicio': () => import('@/pages/AntiVicio'),
  '/privacidade': () => import('@/pages/PrivacyPolicy'),
  '/notas': () => import('@/pages/Notes'),
  '/redes': () => import('@/pages/Redes'),
  '/install': () => import('@/pages/Install'),
  '/admin': () => import('@/pages/Admin'),
  '/biblioteca': () => import('@/pages/Library'),
  '/leitor': () => import('@/pages/Reader'),
  '/marcadores': () => import('@/pages/Bookmarks'),
  '/assistente': () => import('@/pages/AIAssistant'),
  '/rotina': () => import('@/rotina/RotinaPage'),
} satisfies Record<string, Carregador>;

type Caminho = keyof typeof telas;

const iniciadas = new Set<string>();

function caminhoDe(href: string): Caminho | null {
  try {
    const { pathname, origin } = new URL(href, window.location.origin);
    if (origin !== window.location.origin) return null;
    const raiz = `/${pathname.split('/')[1] ?? ''}`;
    return raiz in telas ? (raiz as Caminho) : null;
  } catch {
    return null;
  }
}

/** Baixa o código de uma tela sem abri-la (ignora repetições e erros). */
export function preloadRoute(href: string): void {
  const c = caminhoDe(href);
  if (!c || iniciadas.has(c)) return;
  iniciadas.add(c);
  telas[c]().catch(() => iniciadas.delete(c));
}

/**
 * Começa a baixar a tela que vai abrir junto com o restante do app, sem esperar
 * a confirmação do login. Quem já entrou e abre "/" ou "/auth" vai para o painel.
 */
export function preloadInitialRoute(signedInBefore: boolean): void {
  const { pathname } = window.location;
  const raiz = `/${pathname.split('/')[1] ?? ''}`;
  if (signedInBefore && (raiz === '/' || raiz === '/auth')) preloadRoute('/dashboard');
  else preloadRoute(pathname);
}

/** Telas mais usadas, baixadas aos poucos quando o aparelho está ocioso. */
const MAIS_USADAS: Caminho[] = ['/dashboard', '/foco', '/tarefas', '/rotina', '/cursos', '/planejamentos', '/notas'];

export function preloadCommonRoutes(): () => void {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || /2g/.test(conn?.effectiveType ?? '')) return () => {};
  const fila = [...MAIS_USADAS];
  let parado = false;
  const ocioso = (cb: () => void) => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(cb, { timeout: 3000 });
    else setTimeout(cb, 400);
  };
  const proxima = () => {
    const c = fila.shift();
    if (parado || !c) return;
    preloadRoute(c);
    ocioso(proxima);
  };
  const inicio = window.setTimeout(() => ocioso(proxima), 1500);
  return () => {
    parado = true;
    window.clearTimeout(inicio);
  };
}

/** Baixa a tela assim que o dedo/mouse chega num link do menu, antes do clique. */
export function installLinkPreload(): () => void {
  const aoApontar = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (a) preloadRoute(a.href);
  };
  document.addEventListener('pointerover', aoApontar, { passive: true });
  document.addEventListener('touchstart', aoApontar, { passive: true });
  document.addEventListener('focusin', aoApontar);
  return () => {
    document.removeEventListener('pointerover', aoApontar);
    document.removeEventListener('touchstart', aoApontar);
    document.removeEventListener('focusin', aoApontar);
  };
}
