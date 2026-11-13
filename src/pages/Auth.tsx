import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, UserCheck, Zap, Clock, Flame, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { validatePasswordStrength } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type AuthView = 'login' | 'signup' | 'forgot' | 'reset';

const INPUT = 'brand-input h-12 w-full rounded-xl bg-muted/60 pl-10 pr-10 text-sm focus-visible:ring-0 focus-visible:ring-offset-0';
const LABEL = 'mb-2 block text-xs font-medium text-muted-foreground';
const PRIMARY_BTN = 'h-12 w-full rounded-xl text-base font-semibold shadow-[var(--shadow-glow)]';

function Field({
  id,
  label,
  icon: Icon,
  aside,
  hint,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly aside?: React.ReactNode;
  readonly hint?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className={LABEL}>{label}</Label>
        {aside}
      </div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PasswordToggle({ shown, onToggle }: { readonly shown: boolean; readonly onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Ocultar senha' : 'Mostrar senha'}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
    >
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

const highlights: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Clock, title: 'Horas sob controle', desc: 'Total por curso, por categoria e geral.' },
  { icon: Flame, title: 'Ofensivas e foco', desc: 'Pomodoro persistente com histórico.' },
  { icon: Sparkles, title: 'Assistente com IA', desc: 'Resumos e planos de estudo.' },
];

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { signIn, signUp, user, resetPassword, updatePassword, enterAsGuest } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('mode') === 'reset') setAuthView('reset');
  }, [searchParams]);

  useEffect(() => {
    if (user && authView !== 'reset') navigate('/dashboard');
  }, [user, navigate, authView]);

  const validatePassword = (password: string) => {
    const result = validatePasswordStrength(password);
    return result.valid ? { valid: true, message: '' } : { valid: false, message: result.errors[0] };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      toast({
        title: 'Erro ao entrar',
        description:
          error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Bem-vindo de volta!', description: 'Login realizado com sucesso.' });
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const v = validatePassword(signupPassword);
    if (!v.valid) {
      toast({ title: 'Senha inválida', description: v.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    if (error) {
      toast({
        title: 'Erro ao criar conta',
        description:
          error.message === 'User already registered' ? 'Este email já está cadastrado' : error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Conta criada!', description: 'Bem-vindo ao FD-Planner.' });
      navigate('/onboarding');
    }
    setIsLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await resetPassword(forgotEmail);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email enviado', description: 'Verifique sua caixa de entrada.' });
      setAuthView('login');
      setForgotEmail('');
    }
    setIsLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (newPassword !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    const v = validatePassword(newPassword);
    if (!v.valid) {
      toast({ title: 'Senha inválida', description: v.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    const { error } = await updatePassword(newPassword);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Senha atualizada', description: 'Sua senha foi redefinida.' });
      navigate('/');
    }
    setIsLoading(false);
  };

  const passwordToggle = <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />;
  const spinner = <Loader2 className="mr-2 h-4 w-4 animate-spin" />;

  return (
    <div className="brand-surface flex min-h-screen w-full">
      {/* Painel de marca */}
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden border-r border-border/60 p-12 lg:flex xl:p-16">
        <div aria-hidden className="brand-grid pointer-events-none absolute inset-0" />
        <div aria-hidden className="brand-glow pointer-events-none absolute -left-20 -top-32 h-[520px] w-[520px]" />
        <div aria-hidden className="brand-glow-accent pointer-events-none absolute -bottom-24 right-0 h-80 w-80" />

        <Link to="/" className="relative z-10 flex w-fit items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-glow)]">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold">FD-Planner</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative z-10 max-w-lg"
        >
          <h1 className="text-4xl font-bold leading-[1.08] xl:text-5xl">
            O sucesso é um sistema de <span className="text-brand-gradient">hábitos consistentes</span>.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Foco, cursos, biblioteca e planejamento integrados para desenhar sua rotina de aprendizado.
          </p>

          <ul className="mt-10 space-y-3">
            {highlights.map((h, i) => (
              <motion.li
                key={h.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="brand-card flex items-center gap-4 rounded-2xl p-4"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <h.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{h.title}</p>
                  <p className="text-sm text-muted-foreground">{h.desc}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <p className="relative z-10 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Estudo · Foco · Evolução
        </p>
      </aside>

      {/* Formulário */}
      <main className="relative flex w-full items-center justify-center p-6 sm:p-10 lg:w-[54%]">
        <div aria-hidden className="brand-glow pointer-events-none absolute -right-24 -top-32 h-80 w-80 lg:hidden" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-[420px]"
        >
          <div className="mb-10 flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Início
              </Link>
            </Button>
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                <Zap className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold">FD-Planner</span>
            </Link>
          </div>

          {authView === 'forgot' && (
            <div>
              <h2 className="text-3xl font-bold">Recuperar senha</h2>
              <p className="mb-8 mt-2 text-muted-foreground">Enviaremos um link de recuperação para seu email.</p>
              <form onSubmit={handleForgot} className="space-y-5">
                <Field id="forgot-email" label="Email" icon={Mail}>
                  <Input id="forgot-email" type="email" autoComplete="email" placeholder="seu@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required className={INPUT} />
                </Field>
                <Button type="submit" disabled={isLoading} className={PRIMARY_BTN}>
                  {isLoading && spinner}
                  {isLoading ? 'Enviando...' : 'Enviar link'}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setAuthView('login')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o login
                </Button>
              </form>
            </div>
          )}

          {authView === 'reset' && (
            <div>
              <h2 className="text-3xl font-bold">Nova senha</h2>
              <p className="mb-8 mt-2 text-muted-foreground">Defina uma nova senha para sua conta.</p>
              <form onSubmit={handleReset} className="space-y-5">
                <Field id="new-password" label="Nova senha" icon={Lock}>
                  <Input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className={INPUT} />
                  {passwordToggle}
                </Field>
                <Field id="confirm-password" label="Confirmar senha" icon={Lock} hint="Mín. 8 caracteres com maiúscula, minúscula, número e caractere especial.">
                  <Input id="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className={INPUT} />
                </Field>
                <Button type="submit" disabled={isLoading} className={PRIMARY_BTN}>
                  {isLoading && spinner}
                  {isLoading ? 'Salvando...' : 'Salvar nova senha'}
                </Button>
              </form>
            </div>
          )}

          {(authView === 'login' || authView === 'signup') && (
            <div>
              <h2 className="text-3xl font-bold">
                {authView === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h2>
              <p className="mb-8 mt-2 text-muted-foreground">
                {authView === 'login'
                  ? 'Entre para continuar sua jornada de estudos.'
                  : 'Leva menos de um minuto. É grátis.'}
              </p>

              <Tabs value={authView} onValueChange={(v) => setAuthView(v as AuthView)} className="w-full">
                <TabsList className="mb-7 grid h-11 w-full grid-cols-2 rounded-xl border border-border bg-muted/60 p-1">
                  <TabsTrigger value="login" className="rounded-lg text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-lg text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                    Criar conta
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <Field id="login-email" label="Email" icon={Mail}>
                      <Input id="login-email" type="email" autoComplete="email" placeholder="seu@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className={INPUT} />
                    </Field>
                    <Field
                      id="login-password"
                      label="Senha"
                      icon={Lock}
                      aside={
                        <button type="button" onClick={() => setAuthView('forgot')} className="mb-2 text-xs font-medium text-primary transition-colors hover:text-foreground">
                          Esqueceu a senha?
                        </button>
                      }
                    >
                      <Input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className={INPUT} />
                      {passwordToggle}
                    </Field>
                    <Button type="submit" disabled={isLoading} className={PRIMARY_BTN}>
                      {isLoading && spinner}
                      {isLoading ? 'Entrando...' : 'Entrar na plataforma'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignup} className="space-y-5">
                    <Field id="signup-name" label="Nome" icon={User}>
                      <Input id="signup-name" type="text" autoComplete="name" placeholder="Seu nome" value={signupName} onChange={(e) => setSignupName(e.target.value)} required className={INPUT} />
                    </Field>
                    <Field id="signup-email" label="Email" icon={Mail}>
                      <Input id="signup-email" type="email" autoComplete="email" placeholder="seu@email.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required className={INPUT} />
                    </Field>
                    <Field id="signup-password" label="Senha" icon={Lock} hint="Inclua maiúscula, minúscula, número e caractere especial.">
                      <Input id="signup-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Mín. 8 caracteres" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={8} className={INPUT} />
                      {passwordToggle}
                    </Field>
                    <Button type="submit" disabled={isLoading} className={PRIMARY_BTN}>
                      {isLoading && spinner}
                      {isLoading ? 'Criando conta...' : 'Criar minha conta'}
                    </Button>
                    <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Seus dados ficam protegidos e só você tem acesso.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest">
                  <span className="bg-background px-3 text-muted-foreground">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-12 w-full gap-2 rounded-xl border-border bg-muted/30 text-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground"
                onClick={() => {
                  enterAsGuest();
                  navigate('/dashboard');
                }}
              >
                <UserCheck className="h-4 w-4" />
                Explorar como visitante
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Acesse todas as telas em modo demonstração.
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
