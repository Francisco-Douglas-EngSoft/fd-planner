import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Archive, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { RotinaEstado } from '../hooks';
import type { NovaTarefaInput, RotinaCategoria, RotinaTarefa } from '../tipos';
import { ordenarPorHora } from '../calculos';
import { DIAS_SEMANA_LETRA, DIAS_SEMANA_NOME } from '../datas';
import { tarefaSchema } from '../api';
import { GerenciarCategorias } from './GerenciarCategorias';
import { BotaoLembrete, CartaoLembretes } from './Lembretes';

const SEM_CATEGORIA = 'sem-categoria';
const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];

const duracaoDeTexto = (s: string): number | null => (s.trim() === '' ? null : Number(s));

function SeletorDias({ valor, onChange, rotulo }: { valor: number[]; onChange: (d: number[]) => void; rotulo: string }) {
  return (
    <div className="flex w-full gap-1 md:w-auto" role="group" aria-label={rotulo}>
      {TODOS_OS_DIAS.map((d) => {
        const ativo = valor.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={ativo}
            aria-label={DIAS_SEMANA_NOME[d]}
            title={DIAS_SEMANA_NOME[d]}
            onClick={() => onChange(ativo ? valor.filter((x) => x !== d) : [...valor, d].sort())}
            className={cn(
              'h-11 min-w-0 flex-1 rounded-lg text-xs font-semibold transition-colors md:h-8 md:w-7 md:flex-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              ativo ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70',
            )}
          >
            {DIAS_SEMANA_LETRA[d]}
          </button>
        );
      })}
    </div>
  );
}

function SeletorCategoria({
  valor,
  categorias,
  onChange,
  id,
}: {
  valor: string | null;
  categorias: RotinaCategoria[];
  onChange: (id: string | null) => void;
  id?: string;
}) {
  return (
    <Select value={valor ?? SEM_CATEGORIA} onValueChange={(v) => onChange(v === SEM_CATEGORIA ? null : v)}>
      <SelectTrigger id={id} className="h-11 min-w-0 md:h-9 [&>span]:min-w-0 [&>span]:truncate" aria-label="Categoria">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {categorias.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.cor }} aria-hidden />
              <span className="truncate">{c.nome}</span>
            </span>
          </SelectItem>
        ))}
        <SelectItem value={SEM_CATEGORIA}>Sem categoria</SelectItem>
      </SelectContent>
    </Select>
  );
}

interface LinhaProps {
  tarefa: RotinaTarefa;
  categorias: RotinaCategoria[];
  rotina: RotinaEstado;
}

/** Linha editável como numa planilha: textos salvam ao sair do campo ou com Enter. */
function LinhaTarefa({ tarefa, categorias, rotina }: LinhaProps) {
  const { toast } = useToast();
  const [nome, setNome] = useState(tarefa.nome);
  const [hora, setHora] = useState(tarefa.hora);
  const [duracao, setDuracao] = useState(tarefa.duracao_min?.toString() ?? '');

  useEffect(() => setNome(tarefa.nome), [tarefa.nome]);
  useEffect(() => setHora(tarefa.hora), [tarefa.hora]);
  useEffect(() => setDuracao(tarefa.duracao_min?.toString() ?? ''), [tarefa.duracao_min]);

  const salvar = <K extends 'nome' | 'hora' | 'duracao_min'>(campo: K, valor: unknown, reverter: () => void) => {
    const r = tarefaSchema.shape[campo].safeParse(valor);
    if (!r.success) {
      toast({ title: 'Valor inválido', description: r.error.issues[0]?.message, variant: 'destructive' });
      reverter();
      return;
    }
    if (r.data === tarefa[campo]) return;
    rotina.acoes.atualizarTarefa(tarefa.id, { [campo]: r.data });
  };

  const teclas = (reverter: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') {
      reverter();
      requestAnimationFrame(() => e.currentTarget?.blur());
    }
  };

  const reverterNome = () => setNome(tarefa.nome);
  const reverterHora = () => setHora(tarefa.hora);
  const reverterDuracao = () => setDuracao(tarefa.duracao_min?.toString() ?? '');
  const sufixo = `tarefa-${tarefa.id}`;

  return (
    <li
      className={cn(
        'grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2 rounded-xl border bg-card p-3',
        'md:grid-cols-[6.5rem_minmax(0,1fr)_4.5rem_9.5rem_auto_auto_auto_auto] md:rounded-none md:border-0 md:border-b md:bg-transparent md:px-2 md:py-1.5',
        !tarefa.ativa && 'opacity-60',
      )}
    >
      <Label htmlFor={`hora-${sufixo}`} className="sr-only">Horário</Label>
      <Input
        id={`hora-${sufixo}`}
        type="time"
        value={hora}
        onChange={(e) => setHora(e.target.value)}
        onBlur={() => salvar('hora', hora, reverterHora)}
        onKeyDown={teclas(reverterHora)}
        className="h-11 tabular-nums md:h-9"
      />
      <Label htmlFor={`nome-${sufixo}`} className="sr-only">Nome da tarefa</Label>
      <Input
        id={`nome-${sufixo}`}
        value={nome}
        title={nome}
        maxLength={200}
        onChange={(e) => setNome(e.target.value)}
        onBlur={() => salvar('nome', nome.trim(), reverterNome)}
        onKeyDown={teclas(reverterNome)}
        className="h-11 md:h-9"
      />
      <div className="flex items-center gap-1">
        <Label htmlFor={`dur-${sufixo}`} className="sr-only">Duração em minutos</Label>
        <Input
          id={`dur-${sufixo}`}
          type="number"
          inputMode="numeric"
          min={1}
          max={1440}
          placeholder="—"
          value={duracao}
          onChange={(e) => setDuracao(e.target.value)}
          onBlur={() => salvar('duracao_min', duracaoDeTexto(duracao), reverterDuracao)}
          onKeyDown={teclas(reverterDuracao)}
          className="h-11 tabular-nums md:h-9"
        />
        <span className="text-xs text-muted-foreground md:sr-only">min</span>
      </div>
      <SeletorCategoria
        valor={tarefa.categoria_id}
        categorias={categorias}
        onChange={(categoria_id) => rotina.acoes.atualizarTarefa(tarefa.id, { categoria_id })}
      />
      <div className="col-span-2 md:col-span-1">
        <SeletorDias
          rotulo="Dias em que se repete"
          valor={tarefa.dias_semana}
          onChange={(dias) => {
            if (dias.length === 0) {
              toast({ title: 'Escolha pelo menos um dia', description: 'Para pausar a tarefa, desative-a.', variant: 'destructive' });
              return;
            }
            rotina.acoes.atualizarTarefa(tarefa.id, { dias_semana: dias });
          }}
        />
      </div>
      <div className="flex min-h-[44px] items-center gap-2 md:min-h-0">
        <Switch
          id={`ativa-${sufixo}`}
          checked={tarefa.ativa}
          onCheckedChange={(ativa) => rotina.acoes.atualizarTarefa(tarefa.id, { ativa })}
        />
        <Label htmlFor={`ativa-${sufixo}`} className="text-xs text-muted-foreground md:sr-only">
          {tarefa.ativa ? 'Ativa' : 'Arquivada'}
        </Label>
      </div>
      <div className="flex items-center justify-end gap-1 md:contents">
      <BotaoLembrete tarefa={tarefa} rotina={rotina} />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-11 w-11 justify-self-end text-muted-foreground hover:text-destructive md:h-9 md:w-9" aria-label={`Remover ${tarefa.nome}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover “{tarefa.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              O histórico de marcações desta tarefa também será apagado. Para só tirar da rotina e manter o histórico, desative-a.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => rotina.acoes.removerTarefa(tarefa.id)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </li>
  );
}

function NovaTarefa({ rotina }: { rotina: RotinaEstado }) {
  const { toast } = useToast();
  const [nome, setNome] = useState('');
  const [hora, setHora] = useState('08:00');
  const [duracao, setDuracao] = useState('');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [dias, setDias] = useState<number[]>(TODOS_OS_DIAS);

  const categoriaEfetiva = categoria ?? rotina.categorias[0]?.id ?? null;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const r = tarefaSchema.safeParse({
      nome,
      hora,
      duracao_min: duracaoDeTexto(duracao),
      categoria_id: categoriaEfetiva,
      dias_semana: dias,
    });
    if (!r.success) {
      toast({ title: 'Confira os dados', description: r.error.issues[0]?.message, variant: 'destructive' });
      return;
    }
    try {
      await rotina.acoes.criarTarefa(r.data as NovaTarefaInput);
      setNome('');
      setDuracao('');
    } catch {
      // aviso já exibido
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-xl border border-dashed bg-muted/30 p-3" aria-label="Nova tarefa">
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2 md:grid-cols-[6.5rem_minmax(0,1fr)_5.5rem_11rem]">
        <div>
          <Label htmlFor="nova-hora" className="mb-1 block text-xs text-muted-foreground">Horário</Label>
          <Input id="nova-hora" type="time" required value={hora} onChange={(e) => setHora(e.target.value)} className="h-11 tabular-nums md:h-9" />
        </div>
        <div>
          <Label htmlFor="nova-nome" className="mb-1 block text-xs text-muted-foreground">Tarefa</Label>
          <Input id="nova-nome" required maxLength={200} placeholder="Ex.: Leitura" value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 md:h-9" />
        </div>
        <div>
          <Label htmlFor="nova-duracao" className="mb-1 block text-xs text-muted-foreground">Duração (min)</Label>
          <Input
            id="nova-duracao"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            placeholder="opcional"
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
            className="h-11 tabular-nums md:h-9"
          />
        </div>
        <div>
          <Label htmlFor="nova-categoria" className="mb-1 block text-xs text-muted-foreground">Categoria</Label>
          <SeletorCategoria id="nova-categoria" valor={categoriaEfetiva} categorias={rotina.categorias} onChange={setCategoria} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SeletorDias rotulo="Dias em que a nova tarefa se repete" valor={dias} onChange={setDias} />
        <Button type="submit" className="h-11 md:h-9" disabled={rotina.criandoTarefa}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </div>
    </form>
  );
}

export function GerenciarTarefas({ rotina }: { rotina: RotinaEstado }) {
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const ordenadas = useMemo(() => ordenarPorHora(rotina.tarefas), [rotina.tarefas]);
  const ativas = ordenadas.filter((t) => t.ativa);
  const arquivadas = ordenadas.filter((t) => !t.ativa);

  return (
    <div className="space-y-4">
      <CartaoLembretes rotina={rotina} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
          <CardTitle className="text-base">Tarefas da rotina</CardTitle>
          <span className="text-sm text-muted-foreground">{ativas.length} ativas</span>
        </CardHeader>
        <CardContent className="space-y-3">
          <NovaTarefa rotina={rotina} />

          <div
            className="hidden grid-cols-[6.5rem_minmax(0,1fr)_4.5rem_9.5rem_auto_auto_auto_auto] gap-2 border-b px-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid"
            aria-hidden
          >
            <span>Horário</span>
            <span>Tarefa</span>
            <span>Min</span>
            <span>Categoria</span>
            <span className="w-[13.75rem]">Dias</span>
            <span>Ativa</span>
            <span className="w-9">Aviso</span>
            <span className="w-9" />
          </div>
          {ativas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma tarefa ativa. Adicione a primeira acima.</p>
          ) : (
            <ul className="space-y-2 md:space-y-0">
              {ativas.map((t) => (
                <LinhaTarefa key={t.id} tarefa={t} categorias={rotina.categorias} rotina={rotina} />
              ))}
            </ul>
          )}

          {arquivadas.length > 0 && (
            <div className="pt-2">
              <Button variant="ghost" className="h-11 md:h-9" onClick={() => setMostrarArquivadas((v) => !v)} aria-expanded={mostrarArquivadas}>
                <Archive className="mr-2 h-4 w-4" />
                {mostrarArquivadas ? 'Ocultar' : 'Mostrar'} arquivadas ({arquivadas.length})
              </Button>
              {mostrarArquivadas && (
                <ul className="mt-2 space-y-2 md:space-y-0">
                  {arquivadas.map((t) => (
                    <LinhaTarefa key={t.id} tarefa={t} categorias={rotina.categorias} rotina={rotina} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <GerenciarCategorias rotina={rotina} />
    </div>
  );
}
