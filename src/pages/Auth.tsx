import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, UserCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { validatePasswordStrength } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type AuthView = 'login' | 'signup' | 'forgot' | 'reset';

const INPUT =
  'w-full bg-[#1c2128] border border-[#232a33] rounded-xl h-12 px-4 pl-10 text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:border-[#a7c4dc] focus:outline-none transition-colors';

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

  return (
    <div className="min-h-screen w-full bg-[#101317] text-white font-body flex selection:bg-[#a7c4dc]/30">
      {/* Painel de marca (esquerda) */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#101317] via-[#1c2128] to-[#232a33] p-12 xl:p-16 flex-col justify-between">
        <div aria-hidden className="absolute -top-40 -right-40 w-[70%] h-[70%] bg-[#a7c4dc]/20 blur-[120px] rounded-full" />
        <div aria-hidden className="absolute -bottom-40 -left-20 w-[50%] h-[50%] bg-[#232a33]/40 blur-[100px] rounded-full" />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex items-center gap-2"
        >
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#a7c4dc] to-[#232a33] grid place-items-center shadow-lg shadow-[#a7c4dc]/30">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">FD-Planner</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative z-10 space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a7c4dc]/10 border border-[#a7c4dc]/20 text-[#a7c4dc] text-sm font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a7c4dc] animate-pulse" />
            Plataforma de estudos
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight max-w-md">
            O sucesso não é um destino — é um sistema de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a7c4dc] to-[#cfd8e3]">
              hábitos consistentes
            </span>
            .
          </h1>
          <p className="text-gray-400 max-w-md text-lg leading-relaxed">
            Foco, biblioteca, flashcards, mapas mentais e IA — tudo integrado para desenhar sua rotina de aprendizado.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { k: '12+', v: 'módulos' },
              { k: 'SM-2', v: 'flashcards' },
              { k: 'IA', v: 'assistente' },
            ].map((s) => (
              <div
                key={s.v}
                className="rounded-2xl border border-[#232a33]/50 bg-[#1c2128]/40 backdrop-blur-md p-4 text-center"
              >
                <p className="font-display text-xl font-bold text-[#cfd8e3]">{s.k}</p>
                <p className="text-[11px] uppercase tracking-widest text-gray-400 mt-1">{s.v}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="relative z-10 text-xs text-gray-500 uppercase tracking-[0.2em]">
          Estudo · Foco · Evolução
        </p>
      </aside>

      {/* Formulário (direita) */}
      <main className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 relative bg-[#101317]">
        <div aria-hidden className="absolute inset-0 pointer-events-none lg:hidden">
          <div className="absolute -top-32 -right-24 w-80 h-80 bg-[#a7c4dc]/15 blur-[100px] rounded-full" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="flex items-center justify-between mb-8">
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-gray-400 hover:text-white hover:bg-[#1c2128]"
              >
                <ArrowLeft className="h-4 w-4" />
                Início
              </Button>
            </Link>
            <div className="lg:hidden flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#a7c4dc] to-[#232a33] grid place-items-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-display font-bold">FD-Planner</span>
            </div>
          </div>

          {authView === 'forgot' && (
            <div>
              <h2 className="font-display text-3xl font-bold mb-2">Recuperar senha</h2>
              <p className="text-gray-400 mb-8">Enviaremos um link de recuperação para seu email.</p>
              <form onSubmit={handleForgot} className="space-y-5">
                <div>
                  <Label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      className={INPUT}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#a7c4dc] hover:bg-[#cfd8e3] text-[#101317] font-semibold rounded-xl shadow-lg shadow-[#a7c4dc]/20"
                >
                  {isLoading ? 'Enviando...' : 'Enviar link'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-gray-400 hover:text-white hover:bg-[#1c2128]"
                  onClick={() => setAuthView('login')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
              </form>
            </div>
          )}

          {authView === 'reset' && (
            <div>
              <h2 className="font-display text-3xl font-bold mb-2">Nova senha</h2>
              <p className="text-gray-400 mb-8">Defina uma nova senha para sua conta.</p>
              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <Label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className={INPUT}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className={INPUT}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Mín. 8 caracteres com maiúscula, minúscula, número e caractere especial.
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#a7c4dc] hover:bg-[#cfd8e3] text-[#101317] font-semibold rounded-xl shadow-lg shadow-[#a7c4dc]/20"
                >
                  {isLoading ? 'Salvando...' : 'Salvar nova senha'}
                </Button>
              </form>
            </div>
          )}

          {(authView === 'login' || authView === 'signup') && (
            <div>
              <h2 className="font-display text-3xl font-bold mb-2">Bem-vindo de volta</h2>
              <p className="text-gray-400 mb-8">Insira seus dados para continuar sua jornada.</p>

              <Tabs
                value={authView}
                onValueChange={(v) => setAuthView(v as AuthView)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 w-full bg-[#1c2128] border border-[#232a33] p-1 rounded-xl mb-6">
                  <TabsTrigger
                    value="login"
                    className="rounded-lg data-[state=active]:bg-[#a7c4dc] data-[state=active]:text-[#101317] text-gray-400"
                  >
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-lg data-[state=active]:bg-[#a7c4dc] data-[state=active]:text-[#101317] text-gray-400"
                  >
                    Criar conta
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <Label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                          className={INPUT}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs uppercase tracking-widest text-gray-400">Senha</Label>
                        <button
                          type="button"
                          onClick={() => setAuthView('forgot')}
                          className="text-xs text-[#cfd8e3] hover:text-[#a7c4dc] font-medium"
                        >
                          Esqueceu?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          className={INPUT}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 bg-[#a7c4dc] hover:bg-[#cfd8e3] text-[#101317] font-semibold rounded-xl shadow-lg shadow-[#a7c4dc]/20"
                    >
                      {isLoading ? 'Entrando...' : 'Entrar na plataforma'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignup} className="space-y-5">
                    <div>
                      <Label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">Nome</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                          type="text"
                          placeholder="Seu nome"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          required
                          className={INPUT}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                          className={INPUT}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mín. 8 caracteres"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                          minLength={8}
                          className={INPUT}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Inclua maiúscula, minúscula, número e caractere especial.
                      </p>
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 bg-[#a7c4dc] hover:bg-[#cfd8e3] text-[#101317] font-semibold rounded-xl shadow-lg shadow-[#a7c4dc]/20"
                    >
                      {isLoading ? 'Criando conta...' : 'Criar minha conta'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#232a33]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest">
                  <span className="bg-[#101317] px-3 text-gray-500">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-2 bg-transparent border-[#232a33] text-white hover:bg-[#1c2128] hover:border-[#a7c4dc]/50 rounded-xl"
                onClick={() => {
                  enterAsGuest();
                  navigate('/dashboard');
                }}
              >
                <UserCheck className="h-4 w-4" />
                Explorar como visitante
              </Button>
              <p className="mt-3 text-center text-xs text-gray-500">
                Acesse todas as telas em modo demonstração.
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}