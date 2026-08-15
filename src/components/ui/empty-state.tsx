import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Estado vazio ilustrado e padronizado (ícone tonal + título + CTA).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-dashed border-2 p-10 sm:p-12 text-center elevation-flat',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 to-transparent" />
      <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
        <Icon className="h-9 w-9" />
      </div>
      <h4 className="relative mb-2 text-lg sm:text-xl font-bold">{title}</h4>
      {description && (
        <p className="relative mx-auto mb-7 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="relative h-11 min-h-11 rounded-xl px-6 font-semibold">
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
