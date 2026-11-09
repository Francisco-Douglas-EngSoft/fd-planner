import { cn } from '@/lib/utils';
import type { ResumoDia } from '../tipos';
import { diaDaSemana, formatarDataBR, intervaloDias, somarDias } from '../datas';

function nivel(p: number | null): string {
  if (p == null) return 'bg-muted/50';
  if (p === 0) return 'bg-muted';
  if (p < 34) return 'bg-success/25';
  if (p < 67) return 'bg-success/50';
  if (p < 100) return 'bg-success/75';
  return 'bg-success';
}

/** Calendário de calor: uma coluna por semana, uma linha por dia (domingo a sábado). */
export function MapaCalor({ resumos, hoje }: { resumos: ResumoDia[]; hoje: string }) {
  if (resumos.length === 0) return null;
  const porData = new Map(resumos.map((r) => [r.data, r]));
  const inicio = resumos[0].data;
  const inicioGrade = somarDias(inicio, -diaDaSemana(inicio));
  const dias = intervaloDias(inicioGrade, hoje);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="grid grid-rows-7 gap-1 pr-1 text-[10px] text-muted-foreground" aria-hidden>
          {['', 'seg', '', 'qua', '', 'sex', ''].map((l, i) => (
            <span key={i} className="flex h-3.5 items-center sm:h-4">{l}</span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1" role="list" aria-label="Conclusão nos últimos 90 dias">
          {dias.map((d) => {
            const r = porData.get(d);
            if (!r) return <span key={d} className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />;
            const texto = `${formatarDataBR(d)}: ${r.percentual == null ? 'sem tarefas' : `${r.percentual}% (${r.concluidas}/${r.total})`}`;
            return (
              <span
                key={d}
                role="listitem"
                title={texto}
                aria-label={texto}
                className={cn('h-3.5 w-3.5 rounded-[3px] sm:h-4 sm:w-4', nivel(r.percentual), d === hoje && 'ring-1 ring-foreground/40')}
              />
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground" aria-hidden>
        <span className="mr-1">Menos</span>
        {[0, 20, 50, 80, 100].map((p) => (
          <span key={p} className={cn('h-3 w-3 rounded-[3px]', nivel(p))} />
        ))}
        <span className="ml-1">Mais</span>
      </div>
    </div>
  );
}
