import { AlertTriangle, HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BUCKET_LABELS,
  STORAGE_BUDGET_BYTES,
  STORAGE_LIMIT_BYTES,
  formatBytes,
  storageLevel,
} from "@/lib/libraryStorage";
import { cn } from "@/lib/utils";

interface Props {
  total: number;
  byBucket: Record<string, number>;
  estimated: boolean;
  onOpenDetails?: () => void;
}

/** Barra "X MB de 800 MB" com o limite real de 1 GB marcado. */
export function StorageMeter({ total, byBucket, estimated, onOpenDetails }: Props) {
  const level = storageLevel(total);
  const pctOfLimit = Math.min(100, (total / STORAGE_LIMIT_BYTES) * 100);
  const budgetMark = (STORAGE_BUDGET_BYTES / STORAGE_LIMIT_BYTES) * 100;
  const remaining = STORAGE_BUDGET_BYTES - total;

  const barColor =
    level === "ok" ? "bg-primary" : level === "near" ? "bg-warning" : "bg-destructive";

  const message =
    level === "over-limit"
      ? "Limite de 1 GB do Supabase ultrapassado — novos envios vão falhar."
      : level === "over-budget"
        ? `Você passou da sua meta em ${formatBytes(-remaining)}.`
        : level === "near"
          ? `Quase na meta: restam ${formatBytes(remaining)}.`
          : `Restam ${formatBytes(remaining)} da sua meta.`;

  const buckets = Object.entries(byBucket).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="tint-card">
      <CardContent className="p-3 sm:p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 bg-primary/10 text-primary shrink-0">
              <HardDrive className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Armazenamento usado {estimated && "(estimado)"}</p>
              <p className="text-lg sm:text-xl font-bold leading-tight tabular-nums">
                {formatBytes(total)} <span className="text-sm font-medium text-muted-foreground">de {formatBytes(STORAGE_BUDGET_BYTES)}</span>
              </p>
            </div>
          </div>
          {onOpenDetails && (
            <Button variant="outline" size="sm" onClick={onOpenDetails}>Ver detalhes</Button>
          )}
        </div>

        <div className="relative h-2.5 w-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={Math.round(total / (1024 * 1024))} aria-valuemin={0} aria-valuemax={1024} aria-label="Espaço usado em MB">
          <div className={cn("h-full transition-all", barColor)} style={{ width: `${pctOfLimit}%` }} />
          <div className="absolute inset-y-0 w-0.5 bg-foreground/60" style={{ left: `${budgetMark}%` }} title="Meta de 800 MB" />
        </div>
        <div className="relative h-3.5 text-[10px] text-muted-foreground tabular-nums">
          <span className="absolute left-0">0</span>
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${budgetMark}%` }}>meta 800 MB</span>
          <span className="absolute right-0">1 GB</span>
        </div>

        <p className={cn("text-xs flex items-center gap-1.5", level === "ok" ? "text-muted-foreground" : level === "near" ? "text-warning" : "text-destructive")}>
          {level !== "ok" && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
          {message}
        </p>

        {buckets.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {buckets.map(([id, size]) => (
              <span key={id}>
                {BUCKET_LABELS[id] ?? id}: <span className="text-foreground font-medium tabular-nums">{formatBytes(size)}</span>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
