import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RotinaCategoria, RotinaTarefa } from '../tipos';
import { formatarDuracao } from '../datas';

interface LinhaDoTempoProps {
  tarefas: RotinaTarefa[];
  categorias: RotinaCategoria[];
  concluidas: Set<string>;
  atualId: string | null;
  onAlternar: (tarefa: RotinaTarefa, concluida: boolean) => void;
}

const COR_SEM_CATEGORIA = 'hsl(var(--muted-foreground))';

/** Linha do tempo vertical estilo mapa de metrô: uma estação por tarefa. */
export function LinhaDoTempo({ tarefas, categorias, concluidas, atualId, onAlternar }: LinhaDoTempoProps) {
  const porId = new Map(categorias.map((c) => [c.id, c]));
  const corDe = (t: RotinaTarefa | undefined) => (t?.categoria_id && porId.get(t.categoria_id)?.cor) || COR_SEM_CATEGORIA;

  return (
    <ol className="relative" aria-label="Tarefas do dia">
      {tarefas.map((t, i) => {
        const feita = concluidas.has(t.id);
        const agora = t.id === atualId;
        const cor = corDe(t);
        const corAnterior = corDe(tarefas[i - 1]);
        const categoria = t.categoria_id ? porId.get(t.categoria_id) : undefined;
        const duracao = formatarDuracao(t.duracao_min);
        return (
          <li key={t.id} className="grid grid-cols-[3rem_1.75rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[3.5rem_2rem_minmax(0,1fr)]">
            <time
              className={cn('pt-[1.1rem] text-right text-sm tabular-nums', agora ? 'font-bold text-foreground' : 'text-muted-foreground')}
              dateTime={t.hora}
            >
              {t.hora}
            </time>

            <div className="relative flex justify-center" aria-hidden>
              {i > 0 && <span className="absolute left-1/2 top-0 h-[1.5rem] w-1 -translate-x-1/2 rounded-b-full" style={{ backgroundColor: corAnterior }} />}
              {i < tarefas.length - 1 && (
                <span className="absolute bottom-0 left-1/2 top-[1.5rem] w-1 -translate-x-1/2" style={{ backgroundColor: cor }} />
              )}
              <span
                className={cn(
                  'relative z-10 mt-[0.9rem] flex h-5 w-5 items-center justify-center rounded-full border-[3px] bg-card transition-colors',
                  agora && 'ring-4 ring-accent/30 motion-safe:animate-pulse',
                )}
                style={{ borderColor: cor, backgroundColor: feita ? cor : undefined }}
              >
                {feita && <Check className="h-3 w-3 text-background" strokeWidth={4} />}
              </span>
            </div>

            <div className="pb-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={feita}
                onClick={() => onAlternar(t, !feita)}
                className={cn(
                  'group flex min-h-[56px] w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-all',
                  'hover:border-foreground/20 hover:shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  agora && !feita && 'border-accent/60 shadow-md ring-1 ring-accent/30',
                  feita && 'bg-muted/40',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                    feita ? 'border-transparent' : 'border-muted-foreground/50 group-hover:border-foreground/60',
                  )}
                  style={feita ? { backgroundColor: cor } : undefined}
                  aria-hidden
                >
                  {feita && <Check className="h-4 w-4 text-background" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm font-medium leading-snug sm:text-[15px]', feita && 'text-muted-foreground line-through decoration-2')}>
                    {t.nome}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {categoria && (
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoria.cor }} aria-hidden />
                        {categoria.nome}
                      </span>
                    )}
                    {duracao && <span>· {duracao}</span>}
                  </span>
                </span>
                {agora && (
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
                    Agora
                  </span>
                )}
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
