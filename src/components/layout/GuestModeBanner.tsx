import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Eye, LogIn, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function GuestModeBanner() {
  const { isGuest, user, exitGuestMode } = useAuth();

  // Only show banner if in guest mode and not logged in
  if (!isGuest || user) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-2 shadow-sm">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">
            <strong>Modo Visitante:</strong> Você está explorando a plataforma. Suas ações não serão salvas.
          </span>
          <span className="sm:hidden">
            <strong>Modo Visitante</strong> - Somente leitura
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button size="sm" variant="secondary" className="gap-1 text-xs h-7">
              <LogIn className="h-3 w-3" />
              <span className="hidden sm:inline">Criar Conta</span>
              <span className="sm:hidden">Entrar</span>
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
