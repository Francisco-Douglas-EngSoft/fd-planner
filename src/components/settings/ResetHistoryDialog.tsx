import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
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
import { AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';

interface ResetHistoryDialogProps {
  children: React.ReactNode;
}

export function ResetHistoryDialog({ children }: ResetHistoryDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');
  const { toast } = useToast();
  const { user } = useAuth();

  const handleReset = async () => {
    if (!user || confirmText !== 'RESETAR TUDO') return;

    setIsResetting(true);

    try {
      // Delete all user data in the correct order to avoid foreign key issues
      const tables = [
        'daily_study_progress',
        'study_plan_courses',
        'study_plan_modules',
        'study_plans',
        'focus_sessions',
        'course_modules',
        'courses',
        'tasks',
        'study_notes',
        'weekly_goals',
        'monthly_goals',
        'impulse_logs',
        'relapses',
        'addiction_checkins',
        'clean_streaks',
        'recovery_goals',
        'addiction_profiles',
        'notification_history',
        'study_reminders',
        'user_achievements',
        'user_certificates',
        'user_projects',
        'user_resume',
        'user_social_links',
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

      // Reset profile stats
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
        title: 'Histórico resetado!',
        description: 'Todos os seus dados foram apagados. Você pode começar do zero.',
      });

      setStep('warning');
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
    <AlertDialog onOpenChange={(open) => { if (!open) { setStep('warning'); setConfirmText(''); } }}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        {step === 'warning' ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Resetar Todo o Histórico
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  Esta ação irá apagar <strong>PERMANENTEMENTE</strong> todos os seus dados, incluindo:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Todos os cursos e módulos</li>
                  <li>Planejamentos e progresso de estudo</li>
                  <li>Sessões de foco</li>
                  <li>Tarefas e notas</li>
                  <li>Metas semanais e mensais</li>
                  <li>Dados anti-vício (streaks, check-ins, etc.)</li>
                  <li>Conquistas e certificados</li>
                  <li>Lembretes e notificações</li>
                </ul>
                <p className="font-semibold text-destructive">
                  Esta ação NÃO pode ser desfeita!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <Button 
                variant="destructive" 
                onClick={() => setStep('confirm')}
              >
                Entendo, continuar
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <RotateCcw className="h-5 w-5" />
                Confirmar Reset Total
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  Para confirmar que você realmente deseja apagar todos os seus dados, 
                  digite <strong className="text-foreground">RESETAR TUDO</strong> abaixo:
                </p>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmação</Label>
                  <Input
                    id="confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Digite: RESETAR TUDO"
                    className="font-mono"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setStep('warning')}>Voltar</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={confirmText !== 'RESETAR TUDO' || isResetting}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Resetar Tudo
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
