import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, UserCheck, Clock, Flame, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import fdPlannerLogo from '@/assets/fd-planner-logo.png';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { validatePasswordStrength } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

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
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? t('Ocultar senha', 'Hide password') : t('Mostrar senha', 'Show password')}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
    >
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

const getHighlights = (t: (pt: string, en: string) => string): { icon: LucideIcon; title: string; desc: string }[] => [
  { icon: Clock, title: t('Horas sob controle', 'Hours under control'), desc: t('Total por curso, por categoria e geral.', 'Totals per course, per category and overall.') },
  { icon: Flame, title: t('Ofensivas e foco', 'Streaks and focus'), desc: t('Pomodoro persistente com histórico.', 'A persistent Pomodoro with history.') },
  { icon: Sparkles, title: t('Assistente com IA', 'AI assistant'), desc: t('Resumos e planos de estudo.', 'Summaries and study plans.') },
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
  const { t } = useI18n();
  const highlights = getHighlights(t);

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
        title: t('Erro ao entrar', 'Sign-in failed'),
        description:
          error.message === 'Invalid login credentials' ? t('Email ou senha incorretos', 'Incorrect email or password') : error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: t('Bem-vindo de volta!', 'Welcome back!'), description: t('Login realizado com sucesso.', 'Signed in successfully.') });
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const v = validatePassword(signupPassword);
    if (!v.valid) {
      toast({ title: t('Senha inválida', 'Invalid password'), description: v.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    if (error) {
      toast({
        title: t('Erro ao criar conta', 'Could not create account'),
        description:
          error.message === 'User already registered' ? t('Este email já está cadastrado', 'This email is already registered') : error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: t('Conta criada!', 'Account created!'), description: t('Bem-vindo ao FD-Planner.', 'Welcome to FD-Planner.') });
      navigate('/onboarding');
    }
    setIsLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await resetPassword(forgotEmail);
    if (error) {
      toast({ title: t('Erro', 'Error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('Email enviado', 'Email sent'), description: t('Verifique sua caixa de entrada.', 'Check your inbox.') });
      setAuthView('login');
      setForgotEmail('');
    }
    setIsLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (newPassword !== confirmPassword) {
      toast({ title: t('Erro', 'Error'), description: t('As senhas não coincidem.', 'Passwords do not match.'), variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    const v = validatePassword(newPassword);
    if (!v.valid) {
      toast({ title: t('Senha inválida', 'Invalid password'), description: v.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    const { error } = await updatePassword(newPassword);
    if (error) {
      toast({ title: t('Erro', 'Error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('Senha atualizada', 'Password updated'), description: t('Sua senha foi redefinida.', 'Your password has been reset.') });
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
          <img
            src={fdPlannerLogo}
            alt="FD-Planner"
            className="h-10 w-10 rounded-xl shadow-[var(--shadow-glow)]"
            width={40}
            height={40}
          />
          <span className="font-display text-xl font-bold">FD-Planner</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative z-10 max-w-lg"
        >
          <h1 className="text-4xl font-bold leading-[1.08] xl:text-5xl">
            {t('O sucesso é um sistema de', 'Success is a system of')} <span className="text-brand-gradient">{t('hábitos consistentes', 'consistent habits')}</span>.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {t('Foco, cursos, biblioteca e planejamento integrados para desenhar sua rotina de aprendizado.', 'Focus, courses, library and planning working together to shape your learning routine.')}
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
          {t('Estudo · Foco · Evolução', 'Study · Focus · Growth')}
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
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" />
                  {t('Início', 'Home')}
                </Link>
              </Button>
              <LanguageSwitcher align="start" className="text-muted-foreground hover:bg-muted hover:text-foreground" />
            </div>
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <img
                src={fdPlannerLogo}
                alt="FD-Planner"
                className="h-8 w-8 rounded-lg"
                width={32}
                height={32}
              />
              <span className="font-display font-bold">FD-Planner</span>
            </Link>
          </div>

          {authView === 'forgot' && (
            <div>
              <h2 className="text-3xl font-bold">{t('Recuperar senha', 'Reset password')}</h2>
              <p className="mb-8 mt-2 text-muted-foreground">{t('Enviaremos um link de recuperação para seu email.', "We'll send a recovery link to your email.")}</p>
              <form onSubmit={handleForgot} className="space-y-5">
                <Field id="forgot-email" label="Email" icon={Mail}>
                  <Input id="forgot-email" type="email" autoComplete="email" placeholder={t('seu@email.com', 'you@email.com')} value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required className={INPUT} />
                </Field>
                <Button type="submit" disabled={isLoading} className={PRIMARY_BTN}>
                  {isLoading && spinner}
                  {isLoading ? t('Enviando...', 'Sending...') : t('Enviar link', 'Send link')}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setAuthView('login')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {t('Voltar para o login', 'Back to sign in')}
                </Button>
              </form>
            </div>
          )}

          {authView === 'reset' && (
            <div>
              <h2 className="text-3xl font-bold">{t('Nova senha', 'New password')}</h2>
              <p className="mb-8 mt-2 text-muted-foreground">{t('Defina uma nova senha para sua conta.', 'Set a new password for your account.')}</p>
              <form onSubmit={handleReset} className="space-y-5">
                <Field id="new-password" label={t('Nova senha', 'New password')} icon={Lock}>
                  <Input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className={INPUT} />
                  {passwordToggle}
                </Field>
                <Field id="confirm-password" label={t('Confirmar senha', 'Confirm password')} icon={Lock} hint={t('Mín. 8 caracteres com maiúscula, minúscula, número e caractere especial.', 'Min. 8 characters with uppercase, lowercase, number and special character.')}>
                  <Input id="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className={INPUT} />
                </Field>
                <Button type="submit" disabled={isLoading} className={PRIMARY_BTN}>
                  {isLoading && spinner}
                  {isLoading ? t('Salvando...', 'Saving...') : t('Salvar nova senha', 'Save new password')}
                </Button>
              </form>
            </div>
          )}

          {(authView === 'login' || authView === 'signup') && (
            <div>
              <h2 className="text-3xl font-bold">
                {authView === 'login' ? t('Bem-vindo de volta', 'Welcome back') : t('Crie sua conta', 'Create your account')}
              </h2>
              <p className="mb-8 mt-2 text-muted-foreground">
                {authView === 'login'
                  ? t('Entre para continuar sua jornada de estudos.', 'Sign in to continue your study journey.')
                  : t('Leva menos de um minuto. É grátis.', 'It takes less than a minute. It\'s free.')}
              </p>

              <Tabs value={authView} onValueChange={(v) => setAuthView(v as AuthView)} className="w-full">
                <TabsList className="mb-7 grid h-11 w-full grid-cols-2 rounded-xl border border-border bg-muted/60 p-1">
                  <TabsTrigger value="login" className="rounded-lg text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                    {t('Entrar', 'Sign in')}
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-lg text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                    {t('Criar conta', 'Sign up')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <Field id="login-email" label="Email" icon={Mail}>
                      <Input id="login-email" type="email" autoComplete="email" placeholder={t('seu@email.com', 'you@email.com')} value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className={INPUT} />
                    </Field>
                    <Field
                      id="login-password"
                      label={t('Senha', 'Password')}
                      icon={Lock}
                      aside={
                        <button type="button" onClick={() => setAuthView('forgot')} className="mb-2 text-xs font-medium text-primary transition-colors hover:text-foreground">
                          {t('Esqueceu a senha?', 'Forgot password?')}
                        </button>
                      }
                    >
                      <Input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className={INPUT} />
                      {passwordToggle}
                    </Field>
                    <Button type="submit" disabled={isLoading} className={PRIMARY_BTN}>
                      {isLoading && spinner}
                      {isLoading ? t('Entrando...', 'Signing in...') : t('Entrar na plataforma', 'Sign in')}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignup} className="space-y-5">
                    <Field id="signup-name" label={t('Nome', 'Name')} icon={User}>
                      <Input id="signup-name" type="text" autoComplete="name" placeholder={t('Seu nome', 'Your name')} value={signupName} onChange={(e) => setSignupName(e.target.value)} required className={INPUT} />
                    </Field>
                    <Field id="signup-email" label="Email" icon={Mail}>
                      <Input id="signup-email" type="email" autoComplete="email" placeholder={t('seu@email.com', 'you@email.com')} value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required className={INPUT} />
                    </Field>
                    <Field id="signup-password" label={t('Senha', 'Password')} icon={Lock} hint={t('Inclua maiúscula, minúscula, número e caractere especial.', 'Include uppercase, lowercase, a number and a special character.')}>
                      <Input id="signup-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder={t('Mín. 8 caracteres', 'Min. 8 characters')} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={8} className={INPUT} />
                      {passwordToggle}
                    </Field>
                    <Button type="submit" disabled={isLoading} className={PRIMARY_BTN}>
                      {isLoading && spinner}
                      {isLoading ? t('Criando conta...', 'Creating account...') : t('Criar minha conta', 'Create my account')}
                    </Button>
                    <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {t('Seus dados ficam protegidos e só você tem acesso.', 'Your data stays protected and only you can access it.')}
                    </p>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest">
                  <span className="bg-background px-3 text-muted-foreground">{t('ou', 'or')}</span>
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
                {t('Explorar como visitante', 'Explore as a guest')}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {t('Acesse todas as telas em modo demonstração.', 'Try every screen in demo mode.')}
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
