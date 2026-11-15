import { AlertTriangle, HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BUCKET_LABELS,
  STORAGE_LIMIT_BYTES,
  formatBytes,
  formatPercent,
  storageLevel,
  storageUsagePercent,
} from "@/lib/libraryStorage";
import { cn } from "@/lib/utils";

interface Props {
  total: number;
  byBucket: Record<string, number>;
  estimated: boolean;
  onOpenDetails?: () => void;
}

/** Barra com a porcentagem real usada do espaço do servidor (2 GB). */
export function StorageMeter({ total, byBucket, estimated, onOpenDetails }: Props) {
  const level = storageLevel(total);
  const pct = storageUsagePercent(total);
  const free = STORAGE_LIMIT_BYTES - total;

  const barColor =
    level === "ok" ? "bg-primary" : level === "near" ? "bg-warning" : "bg-destructive";

  const message =
    level === "over-limit"
      ? `Servidor cheio: ${formatBytes(-free)} acima de ${formatBytes(STORAGE_LIMIT_BYTES)} — novos envios vão falhar.`
      : level === "over-budget"
        ? `Servidor quase cheio: restam só ${formatBytes(free)} livres.`
        : level === "near"
          ? `Atenção: restam ${formatBytes(free)} livres no servidor.`
          : `Restam ${formatBytes(free)} livres no servidor.`;

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
                {formatPercent(pct)}{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  · {formatBytes(total)} de {formatBytes(STORAGE_LIMIT_BYTES)}
                </span>
              </p>
            </div>
          </div>
          {onOpenDetails && (
            <Button variant="outline" size="sm" onClick={onOpenDetails}>Ver detalhes</Button>
          )}
        </div>

        <div className="relative h-2.5 w-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct * 10) / 10} aria-valuemin={0} aria-valuemax={100} aria-label="Porcentagem usada do servidor">
          <div className={cn("h-full transition-all", barColor)} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>0%</span>
          <span>50%</span>
          <span>100% · {formatBytes(STORAGE_LIMIT_BYTES)}</span>
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
