import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Eye, LogIn, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { usePublicSignup } from '@/hooks/usePublicSignup';

export function GuestModeBanner() {
  const { isGuest, user, exitGuestMode } = useAuth();
  const { t } = useI18n();
  const { enabled: signupOpen } = usePublicSignup();

  // Only show banner if in guest mode and not logged in
  if (!isGuest || user) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-2 shadow-sm">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">
            <strong>{t('Modo Visitante:', 'Guest Mode:')}</strong> {t('Você está explorando a plataforma. Suas ações não serão salvas.', "You're exploring the platform. Your actions won't be saved.")}
          </span>
          <span className="sm:hidden">
            <strong>{t('Modo Visitante', 'Guest Mode')}</strong> - {t('Somente leitura', 'Read only')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button size="sm" variant="secondary" className="gap-1 text-xs h-7">
              <LogIn className="h-3 w-3" />
              <span className="hidden sm:inline">{signupOpen ? t('Criar Conta', 'Sign Up') : t('Entrar', 'Sign in')}</span>
              <span className="sm:hidden">{t('Entrar', 'Sign in')}</span>
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-primary-foreground/20"
            onClick={exitGuestMode}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
