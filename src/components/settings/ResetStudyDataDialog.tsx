import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { History, Loader2 } from 'lucide-react';

interface ResetStudyDataDialogProps {
  children: React.ReactNode;
}

export function ResetStudyDataDialog({ children }: ResetStudyDataDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleReset = async () => {
    if (!user || confirmText !== 'RESETAR HISTORICO') return;

    setIsResetting(true);

    try {
      // Only study-history tables — courses/modules/plannings are preserved
      const tables = [
        'focus_sessions',
        'daily_study_progress',
      ];

      for (const table of tables) {
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq('user_id', user.id);

        if (error && !error.message.includes('0 rows')) {
          console.error(`Error deleting from ${table}:`, error);
        }
      }

      // Reset study-related profile stats (keeps courses untouched)
      await supabase
        .from('profiles')
        .update({
          total_study_hours: 0,
          experience_points: 0,
          level: 1,
          streak_days: 0,
          last_study_date: null,
        })
        .eq('id', user.id);

      toast({
        title: 'Histórico de estudos resetado!',
        description: 'Suas horas e sessões de foco foram zeradas. Seus cursos foram mantidos.',
      });

      setConfirmText('');
    } catch (error) {
      toast({
        title: 'Erro ao resetar',
        description: (error instanceof Error ? error.message : String(error)) || 'Não foi possível resetar o histórico.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AlertDialog onOpenChange={(open) => { if (!open) setConfirmText(''); }}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <History className="h-5 w-5" />
            Resetar Histórico de Estudos
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Esta ação irá zerar apenas o seu <strong>histórico de estudos</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Sessões de foco (Pomodoro)</li>
              <li>Progresso diário de estudo</li>
              <li>Total de horas estudadas</li>
              <li>XP, nível e sequência (streak)</li>
            </ul>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              Seus cursos, módulos e planejamentos serão mantidos intactos.
            </p>
            <div className="space-y-2 pt-2">
              <Label htmlFor="confirm-study">
                Digite <strong className="text-foreground">RESETAR HISTORICO</strong> para confirmar:
              </Label>
              <Input
                id="confirm-study"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digite: RESETAR HISTORICO"
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            onClick={handleReset}
            disabled={confirmText !== 'RESETAR HISTORICO' || isResetting}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isResetting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Resetando...
              </>
            ) : (
              <>
                <History className="h-4 w-4" />
                Resetar Histórico
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
