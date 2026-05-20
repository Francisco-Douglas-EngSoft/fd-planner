import { useOfflineSync } from '@/hooks/useOfflineSync';
import { WifiOff, Wifi, RefreshCw, Cloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, pendingActions, syncPendingActions, lastSyncTime } = useOfflineSync();

  if (isOnline && pendingActions === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 lg:bottom-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 shadow-lg border-2",
              isOnline 
                ? "bg-success/10 border-success/30 text-success hover:bg-success/20" 
                : "bg-warning/10 border-warning/30 text-warning hover:bg-warning/20"
            )}
            onClick={() => isOnline && pendingActions > 0 && syncPendingActions()}
          >
            {isOnline ? (
              <>
                {pendingActions > 0 ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>{pendingActions} pendente{pendingActions !== 1 ? 's' : ''}</span>
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4" />
                    <span>Sincronizado</span>
                  </>
                )}
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>Offline</span>
                {pendingActions > 0 && (
                  <Badge variant="secondary" className="bg-white/20">
                    {pendingActions}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isOnline ? (
            pendingActions > 0 ? (
              <p>Clique para sincronizar {pendingActions} ação(ões) pendente(s)</p>
            ) : (
              <p>Todos os dados estão sincronizados</p>
            )
          ) : (
            <p>Você está offline. Suas ações serão salvas localmente.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
