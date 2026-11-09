import { useEffect, useMemo, useRef } from 'react';
import { CalendarClock, CheckCheck, Eraser, Flame, ListPlus, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { RotinaEstado } from '../hooks';
import {
  calcularStreak,
  indexarConclusoes,
  proximaPendente,
  resumoDoDia,
  resumosDoIntervalo,
  tarefaAtual,
  tarefasDoDia,
} from '../calculos';
import { formatarDataExtenso, formatarIntervalo, horaAtualHHMM, horaParaMinutos, somarDias } from '../datas';
import { lancarConfete } from '../confete';
import { AnelProgresso } from './AnelProgresso';
import { FaixaSemana } from './FaixaSemana';
import { LinhaDoTempo } from './LinhaDoTempo';

interface TelaHojeProps {
  rotina: RotinaEstado;
  data: string;
  onDataChange: (data: string) => void;
  onIrParaTarefas: () => void;
}

const VAZIO = new Set<string>();

export function TelaHoje({ rotina, data, onDataChange, onIrParaTarefas }: TelaHojeProps) {
  const { tarefas, categorias, conclusoes, hoje, agora, desde, acoes } = rotina;

  const idx = useMemo(() => indexarConclusoes(conclusoes), [conclusoes]);
  const feitas = idx.get(data) ?? VAZIO;
  const doDia = useMemo(() => tarefasDoDia(tarefas, data, feitas), [tarefas, data, feitas]);
  const resumo = useMemo(() => resumoDoDia(tarefas, data, feitas), [tarefas, data, feitas]);
  const semana = useMemo(() => resumosDoIntervalo(tarefas, idx, somarDias(hoje, -6), hoje), [tarefas, idx, hoje]);
  const streak = useMemo(() => calcularStreak(resumosDoIntervalo(tarefas, idx, desde, hoje), hoje), [tarefas, idx, desde, hoje]);

  const ehHoje = data === hoje;
  const agoraHHMM = horaAtualHHMM(agora);
  const atual = ehHoje ? tarefaAtual(doDia, agoraHHMM) : null;
  const proxima = ehHoje ? proximaPendente(doDia, feitas, agoraHHMM) : null;
  const pendentes = doDia.filter((t) => !feitas.has(t.id));

  // Confete quando o usuário completa o dia.
  const acaoDoUsuario = useRef(false);
  const ultimo = useRef<{ data: string; p: number | null }>({ data, p: resumo.percentual });
  useEffect(() => {
    const prev = ultimo.current;
    if (acaoDoUsuario.current && prev.data === data && prev.p !== 100 && resumo.percentual === 100) {
      lancarConfete(categorias.map((c) => c.cor));
    }
    ultimo.current = { data, p: resumo.percentual };
    acaoDoUsuario.current = false;
  }, [data, resumo.percentual, categorias]);

  const alternar = (tarefaId: string, concluida: boolean) => {
    acaoDoUsuario.current = true;
    acoes.marcar(tarefaId, data, concluida);
  };

  if (tarefas.length === 0) {
    return (
      <EmptyState
        icon={ListPlus}
        title="Sua rotina está vazia"
        description="Adicione as tarefas do seu dia com horário e categoria para acompanhar o progresso."
        actionLabel="Adicionar tarefas"
        onAction={onIrParaTarefas}
      />
    );
  }

  return (
    <div className="space-y-4">
      <FaixaSemana resumos={semana} selecionada={data} hoje={hoje} onSelecionar={onDataChange} />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center gap-4">
            <AnelProgresso valor={resumo.percentual} rotulo={`Progresso de ${formatarDataExtenso(data)}`} />
            <div className="min-w-0">
              <p className="text-sm capitalize text-muted-foreground">{ehHoje ? 'Hoje' : formatarDataExtenso(data)}</p>
              <p className="text-lg font-semibold" aria-live="polite">
                {resumo.concluidas} de {resumo.total} {resumo.total === 1 ? 'tarefa' : 'tarefas'}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Flame className="h-4 w-4 text-warning" aria-hidden />
                <span>
                  <strong className="text-foreground tabular-nums">{streak}</strong> {streak === 1 ? 'dia seguido' : 'dias seguidos'} com 100%
                </span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:ml-auto sm:flex-col">
            <Button
              className="h-11 flex-1"
              disabled={pendentes.length === 0}
              onClick={() => {
                acaoDoUsuario.current = true;
                acoes.marcarTudo(data, pendentes.map((t) => t.id));
              }}
            >
              <CheckCheck className="mr-2 h-4 w-4" /> Marcar tudo
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="h-11 flex-1" disabled={resumo.concluidas === 0}>
                  <Eraser className="mr-2 h-4 w-4" /> Limpar o dia
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar as marcações do dia?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todas as tarefas de {ehHoje ? 'hoje' : formatarDataExtenso(data)} voltarão a ficar pendentes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => acoes.limparDia(data)}>Limpar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {ehHoje && doDia.length > 0 && (
        <div
          className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm"
          role="status"
        >
          {proxima ? (
            <>
              <CalendarClock className="h-5 w-5 shrink-0 text-accent" aria-hidden />
              <p className="min-w-0">
                <span className="text-muted-foreground">Próxima: </span>
                <strong className="tabular-nums">{proxima.hora}</strong> · <span className="font-medium">{proxima.nome}</span>
                <span className="text-muted-foreground">
                  {' '}
                  (em {formatarIntervalo(horaParaMinutos(proxima.hora) - horaParaMinutos(agoraHHMM))})
                </span>
              </p>
            </>
          ) : pendentes.length > 0 ? (
            <>
              <CalendarClock className="h-5 w-5 shrink-0 text-accent" aria-hidden />
              <p>
                {pendentes.length === 1 ? 'Falta 1 tarefa' : `Faltam ${pendentes.length} tarefas`} de hoje para fechar o dia.
              </p>
            </>
          ) : (
            <>
              <PartyPopper className="h-5 w-5 shrink-0 text-success" aria-hidden />
              <p className="font-medium">Dia completo! Todas as tarefas foram feitas.</p>
            </>
          )}
        </div>
      )}

      {doDia.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma tarefa prevista para este dia.
          </CardContent>
        </Card>
      ) : (
        <LinhaDoTempo
          tarefas={doDia}
          categorias={categorias}
          concluidas={feitas}
          atualId={atual?.id ?? null}
          onAlternar={(t, c) => alternar(t.id, c)}
        />
      )}
    </div>
  );
}
