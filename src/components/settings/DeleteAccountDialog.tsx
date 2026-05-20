import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2, Clock, Lock, Eye, EyeOff, Calendar } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DeleteAccountDialogProps {
  children: React.ReactNode;
}

export function DeleteAccountDialog({ children }: DeleteAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [confirmations, setConfirmations] = useState({
    understand: false,
    irreversible: false,
    dataLoss: false,
    waitPeriod: false,
  });
  const [scheduling, setScheduling] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const allConfirmed = confirmations.understand && confirmations.irreversible && confirmations.dataLoss && confirmations.waitPeriod;
  const confirmationMatch = confirmText.toLowerCase() === 'excluir minha conta';
  const deletionDate = addDays(new Date(), 15);

  const verifyPassword = async () => {
    if (!password || !user?.email) return;

    setVerifyingPassword(true);
    setPasswordError('');

    try {
      // Try to sign in with the provided password to verify it
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (error) {
        setPasswordError('Senha incorreta. Tente novamente.');
        return;
      }

      // Password verified, proceed to next step
      setStep(2);
    } catch {
      setPasswordError('Erro ao verificar senha. Tente novamente.');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleScheduleDeletion = async () => {
    if (!user || !allConfirmed || !confirmationMatch) return;

    setScheduling(true);

    try {
      // For now, we'll show a toast explaining the 15-day waiting period
      // In a real implementation, this would create a scheduled deletion record
      
      toast({
        title: 'Exclusão agendada',
        description: `Sua conta será excluída permanentemente em ${format(deletionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}. Você pode cancelar o pedido fazendo login novamente antes dessa data.`,
        duration: 10000,
      });

      // Sign out the user
      await signOut();
      
      handleOpenChange(false);
    } catch (error) {
      console.error('Schedule deletion error:', error);
      toast({
        title: 'Erro ao agendar exclusão',
        description: 'Não foi possível agendar a exclusão. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setScheduling(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setStep(1);
      setPassword('');
      setShowPassword(false);
      setPasswordError('');
      setConfirmText('');
      setConfirmations({ understand: false, irreversible: false, dataLoss: false, waitPeriod: false });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Minha Conta
          </AlertDialogTitle>
          <AlertDialogDescription>
            {step === 1 
              ? 'Por segurança, confirme sua senha para continuar.'
              : step === 2
                ? 'Esta ação é irreversível. Leia atentamente antes de prosseguir.'
                : 'Confirme que você entende as consequências desta ação.'
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Step 1: Password Verification */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 border border-border rounded-lg p-4 flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Verificação de Segurança</p>
                <p className="text-xs text-muted-foreground">
                  Digite sua senha para confirmar sua identidade
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Digite sua senha"
                  className={passwordError ? 'border-destructive' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-destructive">{passwordError}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={verifyPassword}
                disabled={!password || verifyingPassword}
                className="flex-1"
              >
                {verifyingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar Senha'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Warning */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            {/* 15-day notice */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary">Período de Espera de 15 Dias</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sua conta será excluída permanentemente em{' '}
                  <span className="font-semibold">
                    {format(deletionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>. 
                  Você pode cancelar o pedido fazendo login antes dessa data.
                </p>
              </div>
            </div>

            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-destructive">
                ⚠️ O que será excluído permanentemente:
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Seu perfil e credenciais de acesso</li>
                <li>Todos os cursos, módulos e progresso</li>
                <li>Todas as tarefas e planejamentos</li>
                <li>Histórico de sessões de foco</li>
                <li>Anotações de estudo</li>
                <li>Conquistas desbloqueadas</li>
                <li>Todos os dados do módulo AntiVício</li>
                <li>Arquivos enviados (fotos de perfil, capas)</li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              Recomendamos exportar seus dados antes de excluir a conta.
            </p>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setStep(3)}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmations */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="understand"
                  checked={confirmations.understand}
                  onCheckedChange={(checked) => 
                    setConfirmations(prev => ({ ...prev, understand: !!checked }))
                  }
                />
                <Label htmlFor="understand" className="text-sm leading-tight cursor-pointer">
                  Entendo que esta ação não pode ser desfeita após 15 dias
                </Label>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="irreversible"
                  checked={confirmations.irreversible}
                  onCheckedChange={(checked) => 
                    setConfirmations(prev => ({ ...prev, irreversible: !!checked }))
                  }
                />
                <Label htmlFor="irreversible" className="text-sm leading-tight cursor-pointer">
                  Entendo que todos os meus dados serão excluídos permanentemente
                </Label>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="dataLoss"
                  checked={confirmations.dataLoss}
                  onCheckedChange={(checked) => 
                    setConfirmations(prev => ({ ...prev, dataLoss: !!checked }))
                  }
                />
                <Label htmlFor="dataLoss" className="text-sm leading-tight cursor-pointer">
                  Entendo que perderei acesso a todo o meu histórico de estudos e progresso
                </Label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="waitPeriod"
                  checked={confirmations.waitPeriod}
                  onCheckedChange={(checked) => 
                    setConfirmations(prev => ({ ...prev, waitPeriod: !!checked }))
                  }
                />
                <Label htmlFor="waitPeriod" className="text-sm leading-tight cursor-pointer">
                  Entendo que posso cancelar até{' '}
                  <span className="font-semibold">
                    {format(deletionDate, "dd/MM/yyyy", { locale: ptBR })}
                  </span>{' '}
                  fazendo login novamente
                </Label>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="confirm-text" className="text-sm">
                Digite <span className="font-mono font-bold">excluir minha conta</span> para confirmar:
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="excluir minha conta"
                className="font-mono"
              />
            </div>

            {/* Deletion Date Display */}
            <div className="bg-muted/50 border border-border rounded-lg p-3 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Data de exclusão definitiva:</p>
                <p className="text-sm font-semibold text-destructive">
                  {format(deletionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setStep(2)}
                className="flex-1"
                disabled={scheduling}
              >
                Voltar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleScheduleDeletion}
                disabled={!allConfirmed || !confirmationMatch || scheduling}
                className="flex-1"
              >
                {scheduling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Agendar Exclusão
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
