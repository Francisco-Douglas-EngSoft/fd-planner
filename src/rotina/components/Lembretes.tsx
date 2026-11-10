import { useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { RotinaEstado } from '../hooks';
import { ANTECEDENCIAS, rotuloAntecedencia } from '../lembretes';
import { MENSAGEM_ESTADO, estadoAvisos, mostrarAviso, pedirPermissaoAvisos, type EstadoAvisos } from '../notificar';
import type { RotinaTarefa } from '../tipos';

function useEstadoAvisos() {
  const [estado, setEstado] = useState<EstadoAvisos>(() => estadoAvisos());
  const pedir = async () => {
    const novo = await pedirPermissaoAvisos();
    setEstado(novo);
    return novo;
  };
  return { estado, pedir };
}

/** Sino na linha da tarefa: liga/desliga o lembrete e escolhe a antecedência. */
export function BotaoLembrete({ tarefa, rotina }: { tarefa: RotinaTarefa; rotina: RotinaEstado }) {
  const { toast } = useToast();
  const { pedir } = useEstadoAvisos();
  const ligado = tarefa.lembrete_ativo;
  const Icone = ligado ? BellRing : BellOff;
  const id = `lembrete-${tarefa.id}`;

  const alternar = async (valor: boolean) => {
    rotina.acoes.atualizarTarefa(tarefa.id, { lembrete_ativo: valor });
    if (!valor) return;
    const estado = await pedir();
    if (estado !== 'permitido') {
      toast({ title: 'Lembrete ligado', description: `${MENSAGEM_ESTADO[estado]} Enquanto isso, o aviso aparece dentro do app.` });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-11 w-11 md:h-9 md:w-9', ligado ? 'text-primary' : 'text-muted-foreground')}
          aria-label={ligado ? `Lembrete de ${tarefa.nome}: ${rotuloAntecedencia(tarefa.lembrete_min_antes)}` : `Ligar lembrete de ${tarefa.nome}`}
          title={ligado ? `Lembrete: ${rotuloAntecedencia(tarefa.lembrete_min_antes)}` : 'Sem lembrete'}
        >
          <Icone className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={id} className="text-sm font-medium">Avisar nesta tarefa</Label>
          <Switch id={id} checked={ligado} onCheckedChange={alternar} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-quando`} className="text-xs text-muted-foreground">Quando avisar</Label>
          <Select
            value={String(tarefa.lembrete_min_antes)}
            onValueChange={(v) => rotina.acoes.atualizarTarefa(tarefa.id, { lembrete_min_antes: Number(v) })}
            disabled={!ligado}
          >
            <SelectTrigger id={`${id}-quando`} className="h-11 md:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANTECEDENCIAS.map((m) => (
                <SelectItem key={m} value={String(m)}>{rotuloAntecedencia(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Avisa às {tarefa.hora} {tarefa.lembrete_min_antes > 0 ? `(${rotuloAntecedencia(tarefa.lembrete_min_antes)})` : ''} só nos dias marcados
          {tarefa.ativa ? '' : ', quando a tarefa estiver ativa'}. Se você já marcou a tarefa, não avisa.
        </p>
      </PopoverContent>
    </Popover>
  );
}

/** Resumo dos lembretes no topo da aba Tarefas. */
export function CartaoLembretes({ rotina }: { rotina: RotinaEstado }) {
  const { toast } = useToast();
  const { estado, pedir } = useEstadoAvisos();
  const ativas = rotina.tarefas.filter((t) => t.ativa);
  const comLembrete = ativas.filter((t) => t.lembrete_ativo);
  const todasLigadas = ativas.length > 0 && comLembrete.length === ativas.length;

  const ligarTodas = async () => {
    const alvo = todasLigadas ? ativas : ativas.filter((t) => !t.lembrete_ativo);
    alvo.forEach((t) => rotina.acoes.atualizarTarefa(t.id, { lembrete_ativo: !todasLigadas }));
    if (!todasLigadas) await pedir();
  };

  const testar = async () => {
    const e = estado === 'permitido' ? estado : await pedir();
    const ok = await mostrarAviso('⏰ Teste de lembrete', 'Assim você será avisado no horário das tarefas.', 'rotina-teste');
    if (!ok) toast({ title: 'Não foi possível mostrar o aviso', description: e === 'permitido' ? undefined : MENSAGEM_ESTADO[e] });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Bell className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-medium">
              Lembretes: {comLembrete.length} de {ativas.length} tarefa{ativas.length === 1 ? '' : 's'}
            </p>
            <p className="text-sm text-muted-foreground">
              {estado === 'permitido'
                ? 'Toque no sino de cada tarefa para ligar o aviso. Vale enquanto o FD-Planner estiver aberto, numa aba ou instalado.'
                : MENSAGEM_ESTADO[estado]}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {estado === 'pendente' && (
            <Button className="h-11 md:h-9" onClick={() => void pedir()}>Permitir avisos</Button>
          )}
          {ativas.length > 0 && (
            <Button variant="outline" className="h-11 md:h-9" onClick={() => void ligarTodas()}>
              {todasLigadas ? 'Desligar todos' : 'Ligar em todas'}
            </Button>
          )}
          {estado === 'permitido' && (
            <Button variant="ghost" className="h-11 md:h-9" onClick={() => void testar()}>Testar</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
