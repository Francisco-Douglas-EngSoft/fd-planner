import { cn } from '@/lib/utils';

interface AnelProgressoProps {
  valor: number | null;
  tamanho?: number;
  espessura?: number;
  className?: string;
  rotulo?: string;
}

export function AnelProgresso({ valor, tamanho = 112, espessura = 10, className, rotulo }: AnelProgressoProps) {
  const raio = (tamanho - espessura) / 2;
  const circ = 2 * Math.PI * raio;
  const v = Math.max(0, Math.min(100, valor ?? 0));
  const completo = v === 100;
  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: tamanho, height: tamanho }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-label={rotulo ?? 'Progresso do dia'}
    >
      <svg width={tamanho} height={tamanho} className="-rotate-90" aria-hidden>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} fill="none" strokeWidth={espessura} className="stroke-muted" />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - v / 100)}
          className={cn('transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none', completo ? 'stroke-success' : 'stroke-accent')}
        />
      </svg>
      <span className="absolute text-2xl font-bold font-display tabular-nums">
        {valor == null ? '—' : `${v}%`}
      </span>
    </div>
  );
}
