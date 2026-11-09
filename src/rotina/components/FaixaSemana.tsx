import { cn } from '@/lib/utils';
import type { ResumoDia } from '../tipos';
import { DIAS_SEMANA_CURTO, diaDaSemana, formatarDataExtenso } from '../datas';

interface FaixaSemanaProps {
  resumos: ResumoDia[];
  selecionada: string;
  hoje: string;
  onSelecionar: (data: string) => void;
}

/** Faixa com os últimos 7 dias e a % de conclusão de cada um. */
export function FaixaSemana({ resumos, selecionada, hoje, onSelecionar }: FaixaSemanaProps) {
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label="Últimos 7 dias">
      {resumos.map((r) => {
        const ativo = r.data === selecionada;
        const p = r.percentual;
        const completo = p === 100;
        return (
          <button
            key={r.data}
            type="button"
            onClick={() => onSelecionar(r.data)}
            aria-pressed={ativo}
            aria-label={`${formatarDataExtenso(r.data)}${r.data === hoje ? ' (hoje)' : ''}: ${p == null ? 'sem tarefas' : `${p}% concluído`}`}
            className={cn(
              'flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              ativo ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-card hover:bg-muted',
            )}
          >
            <span className={cn('text-[11px] uppercase tracking-wide', ativo ? 'opacity-90' : 'text-muted-foreground')}>
              {r.data === hoje ? 'hoje' : DIAS_SEMANA_CURTO[diaDaSemana(r.data)]}
            </span>
            <span className="text-base font-semibold tabular-nums leading-none">{Number(r.data.slice(8))}</span>
            <span className={cn('h-1 w-8 overflow-hidden rounded-full', ativo ? 'bg-primary-foreground/25' : 'bg-muted')} aria-hidden>
              <span
                className={cn('block h-full rounded-full', completo ? 'bg-success' : ativo ? 'bg-primary-foreground' : 'bg-accent')}
                style={{ width: `${p ?? 0}%` }}
              />
            </span>
            <span className={cn('text-[10px] tabular-nums', ativo ? 'opacity-90' : 'text-muted-foreground')}>
              {p == null ? '—' : `${p}%`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
