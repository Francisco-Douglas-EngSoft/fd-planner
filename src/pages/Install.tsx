import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/ui/Logo';
import { 
  Download, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Bell, 
  Zap,
  CheckCircle2,
  Share,
  MoreVertical,
  PlusSquare,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | 'desktop' | 'unknown';

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [platform, setPlatform] = useState<Platform>('unknown');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error('Install error:', error);
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const features = [
    {
      icon: Zap,
      title: 'Acesso Rápido',
      description: 'Abra direto da tela inicial, sem navegador'
    },
    {
      icon: WifiOff,
      title: 'Funciona Offline',
      description: 'Acesse seus dados mesmo sem internet'
    },
    {
      icon: Bell,
      title: 'Notificações',
      description: 'Receba lembretes de estudo e alertas'
    },
    {
      icon: Smartphone,
      title: 'Experiência Nativa',
      description: 'Interface otimizada para seu dispositivo'
    }
  ];

  const renderIOSInstructions = () => (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-center">Como instalar no iOS</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">Toque no botão Compartilhar</p>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                <Share className="h-4 w-4" />
                <span>Na barra inferior do Safari</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">Role e toque em "Adicionar à Tela Inicial"</p>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                <PlusSquare className="h-4 w-4" />
                <span>Add to Home Screen</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">Toque em "Adicionar"</p>
              <p className="text-sm text-muted-foreground mt-1">
                O ícone do FD-Planner aparecerá na sua tela inicial
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderAndroidInstructions = () => (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-center">Como instalar no Android</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">Toque no menu do navegador</p>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                <MoreVertical className="h-4 w-4" />
                <span>Três pontos no canto superior</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">Toque em "Instalar aplicativo"</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ou "Adicionar à tela inicial"
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">Confirme a instalação</p>
              <p className="text-sm text-muted-foreground mt-1">
                O app será adicionado à sua tela inicial
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Instalar Aplicativo</h1>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-8 space-y-6 max-w-lg mx-auto w-full">
        {/* Logo and Title */}
        <div className="text-center space-y-4 py-6">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden">
              <img 
                src="/icon-512.png" 
                alt="FD-Planner" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gradient">FD-Planner</h2>
            <p className="text-muted-foreground">FD-Planner</p>
          </div>
        </div>

        {/* Already Installed */}
        {isInstalled ? (
          <Card className="border-green-500/30 bg-green-500/10">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-500">App Instalado!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  O FD-Planner já está instalado no seu dispositivo.
                  Você pode acessá-lo diretamente da sua tela inicial.
                </p>
              </div>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Ir para o Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature) => (
                <Card 
                  key={feature.title}
                  className="border-border/50 bg-card/50 backdrop-blur-sm"
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Install Button (Chrome/Android) */}
            {deferredPrompt && (
              <Button 
                onClick={handleInstall}
                disabled={installing}
                size="lg"
                className="w-full h-14 text-lg gap-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              >
                {installing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {installing ? 'Instalando...' : 'Instalar Agora'}
              </Button>
            )}

            {/* Platform-specific Instructions */}
            {platform === 'ios' && renderIOSInstructions()}
            {platform === 'android' && !deferredPrompt && renderAndroidInstructions()}
            
            {/* Desktop Instructions */}
            {platform === 'desktop' && !deferredPrompt && (
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center space-y-4">
                  <Wifi className="h-12 w-12 text-primary mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold">Instalação no Desktop</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      No Chrome, clique no ícone de instalação na barra de endereço 
                      ou acesse o menu e selecione "Instalar FD-Planner".
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skip Option */}
            <div className="text-center pt-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="text-muted-foreground"
              >
                Continuar no navegador
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
