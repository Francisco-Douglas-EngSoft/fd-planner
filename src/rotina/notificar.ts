/** Avisos do navegador usados pelos lembretes da Rotina. */

export type EstadoAvisos = 'permitido' | 'bloqueado' | 'pendente' | 'sem-suporte' | 'abrir-em-nova-aba';

const suportaAvisos = () => typeof window !== 'undefined' && 'Notification' in window;
const dentroDeMoldura = () => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
};

export function estadoAvisos(): EstadoAvisos {
  if (!suportaAvisos()) return 'sem-suporte';
  if (Notification.permission === 'granted') return 'permitido';
  if (Notification.permission === 'denied') return 'bloqueado';
  return dentroDeMoldura() ? 'abrir-em-nova-aba' : 'pendente';
}

/** Pede permissão (precisa ser chamado a partir de um clique). */
export async function pedirPermissaoAvisos(): Promise<EstadoAvisos> {
  const atual = estadoAvisos();
  if (atual !== 'pendente') return atual;
  try {
    const r = await Notification.requestPermission();
    return r === 'granted' ? 'permitido' : r === 'denied' ? 'bloqueado' : 'pendente';
  } catch {
    return 'sem-suporte';
  }
}

export const MENSAGEM_ESTADO: Record<Exclude<EstadoAvisos, 'permitido'>, string> = {
  pendente: 'Permita os avisos para receber os lembretes.',
  bloqueado: 'Os avisos estão bloqueados. Libere nas configurações do navegador para este site.',
  'sem-suporte': 'Este navegador não mostra avisos. Os lembretes aparecem dentro do app.',
  'abrir-em-nova-aba': 'Para permitir os avisos, abra o FD-Planner em uma aba própria ou instalado no celular.',
};

/**
 * Mostra um aviso do sistema. Tenta o aviso comum do navegador e, onde ele não
 * existe (Android), o do service worker. Retorna false se não deu.
 */
export async function mostrarAviso(
  titulo: string,
  corpo: string,
  tag: string,
  aoClicar?: () => void,
  url = '/rotina',
): Promise<boolean> {
  if (estadoAvisos() !== 'permitido') return false;
  const opcoes: NotificationOptions = { body: corpo, icon: '/icon-192.png', badge: '/icon-192.png', tag, data: { url } };
  try {
    const n = new Notification(titulo, opcoes);
    n.onclick = () => {
      window.focus();
      aoClicar?.();
      n.close();
    };
    return true;
  } catch {
    // Android: só o service worker pode mostrar avisos.
  }
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (!reg) return false;
    await reg.showNotification(titulo, opcoes);
    return true;
  } catch {
    return false;
  }
}
