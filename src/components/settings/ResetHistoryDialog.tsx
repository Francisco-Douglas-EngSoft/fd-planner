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
import { resetLocalFocusData } from './resetLocalFocusData';

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
      // Clear the offline focus queue FIRST so pending sessions don't
      // get re-synced into the database right after we delete them.
      resetLocalFocusData();

      // Child tables without user_id are deleted through their parent IDs.
      const [plansRes, coursesRes] = await Promise.all([
        supabase.from('study_plans').select('id').eq('user_id', user.id),
        supabase.from('courses').select('id').eq('user_id', user.id),
      ]);
      if (plansRes.error) throw new Error(`study_plans: ${plansRes.error.message}`);
      if (coursesRes.error) throw new Error(`courses: ${coursesRes.error.message}`);
      const planIds = (plansRes.data || []).map((r: any) => r.id);
      const courseIds = (coursesRes.data || []).map((r: any) => r.id);

      const run = async (label: string, q: any) => {
        const { error } = await q;
        if (error) throw new Error(`${label}: ${error.message}`);
      };
      const byUser = (table: string) =>
        run(table, (supabase.from as any)(table).delete().eq('user_id', user.id));

      await byUser('daily_study_progress');
      await byUser('academic_events');
      await byUser('focus_sessions');
      await byUser('tasks');
      await byUser('study_notes');
      if (planIds.length) {
        await run('study_plan_time_blocks', (supabase.from as any)('study_plan_time_blocks').delete().in('study_plan_id', planIds));
        await run('study_plan_courses', (supabase.from as any)('study_plan_courses').delete().in('study_plan_id', planIds));
        await run('study_plan_modules', (supabase.from as any)('study_plan_modules').delete().in('study_plan_id', planIds));
      }
      if (courseIds.length) {
        const modsRes = await (supabase.from as any)('course_modules').select('id').in('course_id', courseIds);
        if (modsRes.error) throw new Error(`course_modules: ${modsRes.error.message}`);
        const moduleIds = (modsRes.data || []).map((r: any) => r.id);
        if (moduleIds.length) {
          await run('course_submodules', (supabase.from as any)('course_submodules').delete().in('module_id', moduleIds));
        }
        await run('study_plan_modules', (supabase.from as any)('study_plan_modules').delete().in('course_id', courseIds));
        await run('course_modules', (supabase.from as any)('course_modules').delete().in('course_id', courseIds));
      }
      await byUser('user_certificates');
      await byUser('study_plans');
      await byUser('courses');

      const rest = [
        'weekly_goals', 'monthly_goals', 'reward_claims', 'reward_goals', 'planning_global_goals',
        'impulse_logs', 'relapses', 'addiction_checkins', 'clean_streaks', 'recovery_goals',
        'addiction_profiles', 'notification_history', 'study_reminders', 'user_achievements',
        'user_projects', 'user_resume', 'user_social_links',
      ];
      for (const table of rest) await byUser(table);

      // Reset profile stats
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          total_study_hours: 0,
          experience_points: 0,
          level: 1,
          streak_days: 0,
          last_study_date: null,
        })
        .eq('id', user.id);
      if (profileError) throw new Error(`profiles: ${profileError.message}`);

      toast({
        title: 'Histórico resetado!',
        description: 'Todos os seus dados foram apagados. Recarregando...',
      });

      setStep('warning');
      setConfirmText('');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      toast({
        title: 'Erro ao resetar',
        description: (error instanceof Error ? error.message : String(error)) || 'Não foi possível resetar o histórico.',
        variant: 'destructive',
      });
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
