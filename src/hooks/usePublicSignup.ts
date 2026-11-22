import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Cadastro público (botão "Criar conta" no login).
 *
 * A chave fica no servidor (tabela `app_settings.public_signup_enabled`, legível
 * só pelo Desenvolvedor; o login usa a função `is_public_signup_enabled`) e é
 * ligada/desligada no Painel do Desenvolvedor. Com ela desligada:
 * - a página de login esconde o formulário "Criar conta" (o código continua lá);
 * - o servidor recusa qualquer conta nova que não tenha sido criada por um
 *   Desenvolvedor (função `public.handle_new_user`).
 * Para reabrir o cadastro para todos, basta ligar a chave no painel.
 */
export const PUBLIC_SIGNUP_CLOSED_BY_DEFAULT = true;

let cached: boolean | null = null;
const listeners = new Set<(v: boolean) => void>();

export async function fetchPublicSignupEnabled(): Promise<boolean> {
  // A tabela só é legível pelo Desenvolvedor; o login consulta apenas o
  // sim/não pela função `is_public_signup_enabled`.
  const { data, error } = await supabase.rpc('is_public_signup_enabled');
  // Sem resposta (offline/erro): trata como fechado — o servidor também recusa.
  const value = !error && typeof data === 'boolean' ? data : !PUBLIC_SIGNUP_CLOSED_BY_DEFAULT;
  cached = value;
  listeners.forEach((l) => l(value));
  return value;
}

export async function setPublicSignupEnabled(enabled: boolean, userId: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('app_settings')
    .update({ public_signup_enabled: enabled, updated_by: userId })
    .eq('id', true)
    .select('public_signup_enabled')
    .maybeSingle();
  if (error || !data) return { error: error?.message ?? 'Sem permissão para alterar.' };
  cached = Boolean(data.public_signup_enabled);
  listeners.forEach((l) => l(cached as boolean));
  return { error: null };
}

export function usePublicSignup() {
  const [enabled, setEnabled] = useState<boolean>(cached ?? !PUBLIC_SIGNUP_CLOSED_BY_DEFAULT);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    listeners.add(setEnabled);
    let active = true;
    fetchPublicSignupEnabled().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      listeners.delete(setEnabled);
    };
  }, []);

  const refresh = useCallback(() => fetchPublicSignupEnabled(), []);
  return { enabled, loading, refresh };
}
