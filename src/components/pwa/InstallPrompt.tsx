import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user dismissed before (with 7-day reset)
      const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
      if (dismissedTime) {
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (parseInt(dismissedTime) < sevenDaysAgo) {
          localStorage.removeItem('pwa-install-dismissed');
          localStorage.removeItem('pwa-install-dismissed-time');
        }
      }
      
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        // Delay showing prompt for better UX
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    // Show iOS prompt after delay if not dismissed
    if (/iphone|ipad|ipod/.test(userAgent)) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      // Navigate to install page for iOS instructions
      navigate('/install');
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Install prompt error:', error);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
  };

  const handleLearnMore = () => {
    setShowPrompt(false);
    navigate('/install');
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  // Show prompt for both native install and iOS
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed left-4 right-4 md:left-auto md:right-4 md:w-96 z-[110]",
        "bg-card border border-border rounded-xl shadow-2xl overflow-hidden",
        "animate-slide-up",
        "bottom-20 md:bottom-4"
      )}
    >
      {/* Gradient Header */}
      <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
      
      <div className="p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
            <img 
              src="/icon-192.png" 
              alt="FD-Planner" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="font-bold text-base">Instalar FD-Planner</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {isIOS 
                ? 'Adicione à tela inicial para acesso rápido e offline.'
                : 'Instale para acesso rápido, notificações e uso offline.'}
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                onClick={handleInstall} 
                className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {isIOS ? <Smartphone className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {isIOS ? 'Ver Instruções' : 'Instalar'}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleLearnMore}
                className="px-3"
              >
                Saiba mais
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
