import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-surface p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 text-center max-w-md mx-auto space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" variant="full" />
        </div>

        {/* 404 Display */}
        <div className="space-y-4">
          <h1 className="text-8xl sm:text-9xl font-bold font-display bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient">
            404
          </h1>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            Página não encontrada
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-sm mx-auto">
            Ops! A página que você está procurando não existe ou foi movida.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/dashboard">
            <Button size="lg" className="w-full sm:w-auto gap-2 bg-gradient-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
              <Home className="h-4 w-4" />
              Ir para o Dashboard
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full sm:w-auto gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Additional Links */}
        <div className="pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground mb-3">
            Links úteis:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/" className="text-sm text-primary hover:underline">
              Página Inicial
            </Link>
            <span className="text-border">•</span>
            <Link to="/cursos" className="text-sm text-primary hover:underline">
              Cursos
            </Link>
            <span className="text-border">•</span>
            <Link to="/foco" className="text-sm text-primary hover:underline">
              Foco
            </Link>
            <span className="text-border">•</span>
            <Link to="/planejamentos" className="text-sm text-primary hover:underline">
              Planejamentos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;