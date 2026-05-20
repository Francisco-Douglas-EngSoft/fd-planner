import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Home, UserCheck, Sparkles, Shield, Zap } from 'lucide-react';
import { validatePasswordStrength } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';

type AuthView = 'login' | 'signup' | 'forgot' | 'reset';

// Floating orb component
const FloatingOrb = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 1, ease: "easeOut" }}
    className={`absolute rounded-full blur-3xl ${className}`}
    style={{
      animation: `blob ${8 + delay * 2}s ease-in-out infinite`,
      animationDelay: `${delay}s`
    }}
  />
);

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
    const mode = searchParams.get('mode');
    if (mode === 'reset') setAuthView('reset');
  }, [searchParams]);

  useEffect(() => {
    if (user && authView !== 'reset') navigate('/dashboard');
  }, [user, navigate, authView]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Bem-vindo de volta!', description: 'Login realizado com sucesso.' });
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const validatePassword = (password: string): { valid: boolean; message: string } => {
    const result = validatePasswordStrength(password);
    if (!result.valid) {
      return { valid: false, message: result.errors[0] };
    }
    return { valid: true, message: '' };
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const passwordValidation = validatePassword(signupPassword);
    if (!passwordValidation.valid) {
      toast({ title: 'Senha inválida', description: passwordValidation.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    if (error) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message === 'User already registered' ? 'Este email já está cadastrado' : error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Conta criada!', description: 'Você já pode começar a usar o FD-Planner.' });
      navigate('/onboarding');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await resetPassword(forgotEmail);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email enviado!', description: 'Verifique sua caixa de entrada para redefinir sua senha.' });
      setAuthView('login');
      setForgotEmail('');
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (newPassword !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      toast({ title: 'Senha inválida', description: passwordValidation.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    const { error } = await updatePassword(newPassword);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Senha atualizada!', description: 'Sua senha foi redefinida com sucesso.' });
      navigate('/');
    }
    setIsLoading(false);
  };

  const features = [
    { icon: Shield, text: 'Dados protegidos' },
    { icon: Zap, text: 'Interface rápida' },
    { icon: Sparkles, text: 'Recursos premium' },
  ];

  const renderForgotPassword = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-panel border-0 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-display">Recuperar Senha</CardTitle>
          <CardDescription>Digite seu email para receber o link de recuperação</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 btn-animated bg-gradient-primary text-white font-semibold" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </Button>
            <Button type="button" variant="ghost" className="w-full gap-2" onClick={() => setAuthView('login')}>
              <ArrowLeft className="h-4 w-4" /> Voltar ao login
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderResetPassword = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-panel border-0 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-display">Nova Senha</CardTitle>
          <CardDescription>Digite sua nova senha</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-background/50 border-border/50"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12 bg-background/50 border-border/50"
                  required
                  minLength={8}
                />
              </div>
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres com maiúscula, minúscula, número e caractere especial</p>
            </div>
            <Button type="submit" className="w-full h-12 btn-animated bg-gradient-primary text-white font-semibold" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderLoginSignup = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="glass-panel border-0 shadow-2xl overflow-hidden">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-between mb-4">
            <Link to="/">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 group border-border/60 hover:border-primary/50 hover:bg-primary/10 hover:shadow-md hover:shadow-primary/20 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <Home className="h-4 w-4 text-primary/80 group-hover:text-primary transition-colors" />
                <span className="font-medium">Início</span>
              </Button>
            </Link>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
          <div>
            <CardTitle className="text-2xl font-display">Bem-vindo ao FD-Planner</CardTitle>
            <CardDescription className="text-base">Entre ou crie sua conta para continuar</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1">
              <TabsTrigger value="login" className="font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-5 mt-0">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Senha</Label>
                    <button type="button" onClick={() => setAuthView('forgot')} className="text-xs text-primary hover:underline font-medium">
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 btn-animated bg-gradient-primary text-white font-semibold text-base" disabled={isLoading}>
                  {isLoading ? 'Entrando...' : 'Fazer Login'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-5 mt-0">
              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mín. 8 caracteres"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                      required
                      minLength={8}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Inclua maiúscula, minúscula, número e caractere especial</p>
                </div>
                <Button type="submit" className="w-full h-12 btn-animated bg-gradient-primary text-white font-semibold text-base" disabled={isLoading}>
                  {isLoading ? 'Criando conta...' : 'Criar Minha Conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Guest Access */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 gap-2 border-border/50 hover:bg-muted/50 transition-colors"
            onClick={() => { enterAsGuest(); navigate('/dashboard'); }}
          >
            <UserCheck className="h-4 w-4" />
            Explorar como Visitante
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Acesse todas as telas em modo demonstração
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex bg-background overflow-hidden">
      {/* Left Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-hero">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <FloatingOrb className="w-96 h-96 bg-primary/30 top-10 -left-20" delay={0} />
          <FloatingOrb className="w-80 h-80 bg-accent/30 bottom-20 right-10" delay={2} />
          <FloatingOrb className="w-64 h-64 bg-primary/20 top-1/2 left-1/3" delay={4} />
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Logo size="lg" className="mb-8" />
            
            <h1 className="text-4xl xl:text-5xl font-display font-bold mb-6 leading-tight">
              Organize seus estudos.
              <span className="block text-gradient mt-2">Alcance seus objetivos.</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-10 max-w-md leading-relaxed">
              FD-Planner - A plataforma mais completa para foco em produtividade, 
              acompanhamento de progresso e bem-estar.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative">
        {/* Mobile Background */}
        <div className="absolute inset-0 bg-gradient-mesh lg:hidden" />
        
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden flex justify-center mb-8"
          >
            <Logo size="md" />
          </motion.div>

          {authView === 'forgot' && renderForgotPassword()}
          {authView === 'reset' && renderResetPassword()}
          {(authView === 'login' || authView === 'signup') && renderLoginSignup()}
        </div>
      </div>
    </div>
  );
}