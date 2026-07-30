import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils';

/** Estado de carregamento padrão do sistema. */
export function LoadingState({
  message = 'Carregando...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-center gap-2 py-16 text-muted-foreground', className)}
    >
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

/** Estado de erro padrão — sempre mostra mensagem + ação de tentar novamente. */
export function ErrorState({
  title = 'Não foi possível carregar os dados',
  error,
  onRetry,
  className,
}: {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const detail = error ? getErrorMessage(error) : undefined;
  return (
    <Card className={cn('border-destructive/40', className)}>
      <CardContent className="py-10 flex flex-col items-center text-center gap-3">
        <div className="p-2 bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          {detail && <p className="text-sm text-muted-foreground max-w-md break-words">{detail}</p>}
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Estado vazio padrão. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('border-dashed border-2', className)}>
      <CardContent className="py-12 flex flex-col items-center text-center gap-3">
        <div className="p-3 bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
          )}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
