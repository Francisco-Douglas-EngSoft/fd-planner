import { useState } from 'react';
import { Loader2, Lock, LockOpen, ShieldCheck, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePublicSignup, setPublicSignupEnabled } from '@/hooks/usePublicSignup';
import { validatePasswordStrength } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type NewRole = 'student' | 'developer';

/** Criação de contas (só Desenvolvedor) e chave do cadastro público. */
export function AccountAccessCard({ onCreated }: { readonly onCreated?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { enabled: signupOpen, loading: signupLoading } = usePublicSignup();
  const [savingSwitch, setSavingSwitch] = useState(false);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<NewRole>('student');
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('student');
  };

  const toggleSignup = async (value: boolean) => {
    if (!user) return;
    setSavingSwitch(true);
    const { error } = await setPublicSignupEnabled(value, user.id);
    setSavingSwitch(false);
    if (error) {
      toast({ title: 'Não foi possível alterar', description: error, variant: 'destructive' });
      return;
    }
    toast({
      title: value ? 'Cadastro público aberto' : 'Cadastro público fechado',
      description: value
        ? 'Qualquer pessoa pode criar conta pela página de login.'
        : 'Só o perfil Desenvolvedor cria contas novas.',
    });
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const pw = validatePasswordStrength(password);
    if (!pw.valid) {
      toast({ title: 'Senha inválida', description: pw.errors[0], variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('developer-create-user', {
      body: { full_name: name.trim(), email: email.trim(), password, role },
    });
    setCreating(false);
    const serverError = (data as { error?: string } | null)?.error;
    if (error || serverError) {
      let message = serverError ?? error?.message ?? 'Erro ao criar conta.';
      const ctx = (error as { context?: Response } | null)?.context;
      if (!serverError && ctx && typeof ctx.json === 'function') {
        try {
          const body = await ctx.json();
          if (body?.error) message = body.error;
        } catch {
          // mantém a mensagem original
        }
      }
      toast({ title: 'Conta não criada', description: message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Conta criada!',
      description: `${email.trim()} já pode entrar${role === 'developer' ? ' como Desenvolvedor' : ''}.`,
    });
    reset();
    setOpen(false);
    onCreated?.();
  };

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Acesso de contas
          </CardTitle>
          <CardDescription>Só o perfil Desenvolvedor cria contas novas.</CardDescription>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Criar conta
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <div className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg', signupOpen ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
              {signupOpen ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                Cadastro público na página de login
                <Badge variant={signupOpen ? 'default' : 'secondary'} className="h-5 px-1.5 text-[10px]">
                  {signupLoading ? '…' : signupOpen ? 'Aberto' : 'Fechado'}
                </Badge>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {signupOpen
                  ? 'Qualquer pessoa pode criar conta em "Criar conta".'
                  : 'O botão "Criar conta" está escondido e o servidor recusa cadastros novos. Ligue quando abrir o acesso.'}
              </p>
            </div>
          </div>
          <Switch
            checked={signupOpen}
            disabled={signupLoading || savingSwitch}
            onCheckedChange={toggleSignup}
            aria-label="Cadastro público"
          />
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="pb-24 sm:max-w-md sm:pb-6">
          <DialogHeader>
            <DialogTitle>Criar conta</DialogTitle>
            <DialogDescription>A pessoa já entra com este email e senha, sem confirmar por email.</DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-user-name">Nome</Label>
              <Input id="new-user-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-user-email">Email</Label>
              <Input id="new-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-user-password">Senha inicial</Label>
              <Input id="new-user-password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">Mín. 8 caracteres com maiúscula, minúscula, número e caractere especial.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['student', 'Estudante', 'Usa o sistema normalmente'],
                  ['developer', 'Desenvolvedor', 'Também cria contas e vê o painel'],
                ] as [NewRole, string, string][]).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    aria-pressed={role === value}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-colors',
                      role === value ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={creating}>Cancelar</Button>
              <Button type="submit" disabled={creating} className="gap-2">
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? 'Criando...' : 'Criar conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
