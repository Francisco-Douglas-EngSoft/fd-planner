/**
 * Dispara os lembretes das tarefas da Rotina enquanto o app está aberto
 * (em qualquer tela). Não desenha nada além do aviso.
 */
import { useCallback, useEffect, useRef } from 'react';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '../api';
import { lembretesVencidos, proximoLembrete, textoDoLembrete, type OcorrenciaLembrete } from '../lembretes';
import { mostrarAviso } from '../notificar';
import type { RotinaConclusao, RotinaTarefa } from '../tipos';

const MAX_ESPERA_MS = 60_000;
const GUARDAR_POR_MS = 3 * 24 * 60 * 60 * 1000;

const chaveEnviados = (uid: string) => `rotina:lembretes:enviados:${uid}`;

function lerEnviados(uid: string): Record<string, number> {
  try {
    const bruto = JSON.parse(localStorage.getItem(chaveEnviados(uid)) || '{}') as Record<string, number>;
    const limite = Date.now() - GUARDAR_POR_MS;
    return Object.fromEntries(Object.entries(bruto).filter(([, ts]) => ts > limite));
  } catch {
    return {};
  }
}

function salvarEnviado(uid: string, chave: string) {
  const atual = lerEnviados(uid);
  atual[chave] = Date.now();
  try {
    localStorage.setItem(chaveEnviados(uid), JSON.stringify(atual));
  } catch {
    // armazenamento cheio: no pior caso o aviso se repete
  }
}

export default function LembretesRotina() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Lista leve só com as tarefas (não cria a rotina padrão para quem nunca abriu a tela).
  const lista = useQuery({
    queryKey: ['rotina', uid, 'lembretes'],
    enabled: !!uid,
    queryFn: api.listarTarefas,
    staleTime: 5 * 60 * 1000,
  });
  // Se a tela da Rotina estiver carregada, usa a versão dela (já com as edições na hora).
  const base = useQuery<{ tarefas: RotinaTarefa[] }>({ queryKey: ['rotina', uid, 'base'], queryFn: skipToken });
  const tarefas = base.data?.tarefas ?? lista.data ?? [];
  const tarefasRef = useRef(tarefas);
  tarefasRef.current = tarefas;

  const jaConcluida = useCallback(
    async (o: OcorrenciaLembrete): Promise<boolean> => {
      const emCache = qc.getQueriesData<RotinaConclusao[]>({ queryKey: ['rotina', uid, 'conclusoes'] });
      for (const [, dados] of emCache) {
        if (dados?.some((c) => c.tarefa_id === o.tarefa.id && c.data === o.data)) return true;
      }
      try {
        const doDia = await api.listarConclusoes(o.data, o.data);
        return doDia.some((c) => c.tarefa_id === o.tarefa.id);
      } catch {
        return false;
      }
    },
    [qc, uid],
  );

  const verificar = useCallback(async () => {
    if (!uid) return;
    const enviados = new Set(Object.keys(lerEnviados(uid)));
    const vencidos = lembretesVencidos(tarefasRef.current, new Date(), enviados);
    for (const o of vencidos) {
      salvarEnviado(uid, o.chave);
      if (await jaConcluida(o)) continue;
      const { titulo, corpo } = textoDoLembrete(o);
      const abrir = () => navigate('/rotina');
      await mostrarAviso(titulo, corpo, `rotina-${o.chave}`, abrir);
      if (document.visibilityState === 'visible') {
        toast(titulo, { description: corpo, duration: 15_000, action: { label: 'Abrir', onClick: abrir } });
      }
    }
  }, [uid, jaConcluida, navigate]);

  // Agenda a próxima verificação para o horário exato do próximo aviso (no máximo a cada minuto).
  useEffect(() => {
    if (!uid) return;
    let timer: number | undefined;
    let ativo = true;
    const agendar = () => {
      if (!ativo) return;
      const proximo = proximoLembrete(tarefasRef.current, new Date());
      const espera = proximo ? Math.min(Math.max(proximo.getTime() - Date.now(), 250), MAX_ESPERA_MS) : MAX_ESPERA_MS;
      timer = window.setTimeout(async () => {
        await verificar();
        agendar();
      }, espera);
    };
    void verificar();
    agendar();
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void verificar();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    return () => {
      ativo = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    };
  }, [uid, verificar, tarefas]);

  return null;
}
