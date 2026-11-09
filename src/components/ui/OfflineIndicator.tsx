import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CloudUpload, Loader2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { SYNC_COMPLETE_EVENT, type SyncCompleteDetail } from "@/lib/offline/syncAll";
import { cn } from "@/lib/utils";

/** "X alterações pendentes" + botão "Sincronizar agora". */
export function OfflineIndicator() {
  const { isOnline, pending, syncing, syncNow } = useSyncStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    const onComplete = (e: Event) => {
      const { sent, conflicts, failed } = (e as CustomEvent<SyncCompleteDetail>).detail;
      if (sent > 0) toast.success(`${sent} alteraç${sent === 1 ? "ão sincronizada" : "ões sincronizadas"}`);
      if (conflicts > 0) {
        toast.info(
          `${conflicts} alteraç${conflicts === 1 ? "ão foi substituída" : "ões foram substituídas"} por uma versão mais recente do servidor.`,
        );
      }
      if (failed > 0) toast.error(`${failed} alteraç${failed === 1 ? "ão não pôde" : "ões não puderam"} ser enviada(s).`);
      void queryClient.invalidateQueries();
    };
    const onOffline = () => toast.warning("Você está offline — alterações serão sincronizadas");
    window.addEventListener(SYNC_COMPLETE_EVENT, onComplete);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener(SYNC_COMPLETE_EVENT, onComplete);
      window.removeEventListener("offline", onOffline);
    };
  }, [queryClient]);

  if (pending === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 z-50 lg:bottom-4 flex items-center gap-2 rounded-full border bg-card/95 py-1 pl-3 pr-1 shadow-lg backdrop-blur",
        isOnline ? "border-primary/30" : "border-warning/40",
      )}
      role="status"
    >
      {isOnline ? <CloudUpload className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-warning" />}
      <span className="text-sm font-medium">
        {pending} alteraç{pending === 1 ? "ão pendente" : "ões pendentes"}
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 rounded-full px-3 text-xs"
        disabled={!isOnline || syncing}
        onClick={() => void syncNow()}
        title={isOnline ? undefined : "Sem internet: será enviado quando a conexão voltar"}
      >
        {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sincronizar agora"}
      </Button>
    </div>
  );
}
