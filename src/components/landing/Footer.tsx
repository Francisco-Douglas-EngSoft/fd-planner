import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";
import { Linkedin, Github, Instagram, ExternalLink, MessageCircle } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

const socialLinks = [
  { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/in/francisco-douglas-sousa" },
  { icon: Github, label: "GitHub", href: "https://github.com/Francisco-Douglas-eng" },
  { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/franciscodouglas77" },
  { icon: ExternalLink, label: "Portfólio", href: "https://portfolio-franciscodouglas.vercel.app/" },
  { icon: MessageCircle, label: "WhatsApp", href: "https://wa.me/5586981625526" },
];

export function Footer() {
  const branding = useBranding();

  const handleLinkClick = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <footer className="py-12 border-t border-border/50 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Logo e Descrição */}
          <div className="space-y-4">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              FD-Planner — Plataforma completa para foco e produtividade acadêmica.
            </p>
          </div>

          {/* Desenvolvedor */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Desenvolvedor</h4>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Desenvolvido com 💜 por
              </p>
              <button
                onClick={() => handleLinkClick("https://portfolio-franciscodouglas.vercel.app/")}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors duration-200"
              >
                Francisco Douglas
              </button>
              <p className="text-xs text-muted-foreground">
                Full Stack Developer
              </p>
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Conecte-se</h4>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <button
                  key={social.label}
                  onClick={() => handleLinkClick(social.href)}
                  className="p-2.5 rounded-xl bg-muted/60 hover:bg-primary/15 hover:text-primary transition-all duration-200 hover:scale-110 active:scale-95 group"
                  aria-label={social.label}
                  title={social.label}
                >
                  <social.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Siga nas redes sociais e acompanhe as novidades.
            </p>
          </div>
        </div>

        {/* Divisória */}
        <div className="mt-8 pt-8 border-t border-border/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {branding.appName}. Todos os direitos reservados.
            </p>
            <div className="flex gap-6">
              <Link
                to="/privacy-policy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Política de Privacidade
              </Link>
              <button
                onClick={() => handleLinkClick("https://portfolio-franciscodouglas.vercel.app/")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Portfólio
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
