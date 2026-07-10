import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copyright, ShieldCheck, Scale, Mail, Phone, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Aviso de autoria, direitos autorais e conformidade LGPD.
 * Reutilizável na página inicial (variant="section") e no painel
 * do desenvolvedor/admin (variant="card").
 */

const DEVELOPER = {
  name: "Francisco Douglas",
  emails: ["franciscodouglas77@gmail.com", "franciscodouglas77@outlook.com"],
  phone: "(86) 98817-5046",
  whatsapp: "https://wa.me/5586988175046",
};

const AUTHORSHIP_TEXT =
  "A arquitetura de software, a estrutura do banco de dados, o design de interface e os códigos-fonte deste sistema foram integralmente desenvolvidos por Francisco Douglas, detentor dos direitos morais de autor sobre a criação tecnológica, estando o uso patrimonial cedido e licenciado para a Prefeitura Municipal de Assunção do Piauí.";

const COPYRIGHT_TEXT =
  "Nos termos da Lei nº 9.610/1998 (Lei de Direitos Autorais), os direitos morais sobre esta obra tecnológica são inalienáveis e permanecem com o autor. É vedada a reprodução, distribuição, modificação ou uso não autorizado, total ou parcial, do código-fonte, da estrutura de dados e do design sem a devida atribuição de autoria e autorização.";

const LGPD_TEXT =
  "Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), este sistema trata dados pessoais de forma transparente, com finalidade específica, e adota medidas técnicas de segurança para proteger as informações dos titulares, que podem exercer seus direitos de acesso, correção e exclusão a qualquer momento.";

interface AuthorshipNoticeProps {
  readonly variant?: "section" | "card";
  readonly className?: string;
}

export function AuthorshipNotice({ variant = "card", className }: AuthorshipNoticeProps) {
  const blocks = (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <Copyright className="h-4 w-4" />
          <h4 className="text-sm font-semibold text-foreground">Autoria</h4>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{AUTHORSHIP_TEXT}</p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <Scale className="h-4 w-4" />
          <h4 className="text-sm font-semibold text-foreground">Direitos Autorais</h4>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{COPYRIGHT_TEXT}</p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <ShieldCheck className="h-4 w-4" />
          <h4 className="text-sm font-semibold text-foreground">LGPD</h4>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{LGPD_TEXT}</p>
      </div>
    </div>
  );

  const contact = (
    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="mb-3 text-xs text-muted-foreground">
        Para suporte técnico, atribuição de autoria ou contatos profissionais, o desenvolvedor
        <span className="font-medium text-foreground"> {DEVELOPER.name}</span> pode ser contatado:
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {DEVELOPER.emails.map((email) => (
          <a
            key={email}
            href={`mailto:${email}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground transition-colors hover:text-primary"
          >
            <Mail className="h-3.5 w-3.5 text-primary" /> {email}
          </a>
        ))}
        <a
          href={DEVELOPER.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground transition-colors hover:text-primary"
        >
          <Phone className="h-3.5 w-3.5 text-primary" /> {DEVELOPER.phone}
        </a>
      </div>
    </div>
  );

  if (variant === "section") {
    return (
      <section className={cn("py-16 sm:py-20 border-t border-border/50 bg-muted/20", className)}>
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <Badge variant="outline" className="mb-4 px-4 py-1.5">
              <Copyright className="mr-1 h-3 w-3" />
              Autoria & Conformidade Legal
            </Badge>
            <h2 className="mb-3 text-2xl font-bold sm:text-3xl">Direitos Autorais e LGPD</h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              Propriedade intelectual, licenciamento de uso e conformidade com a legislação brasileira.
            </p>
          </div>
          <div className="mx-auto max-w-5xl">
            {blocks}
            {contact}
          </div>
        </div>
      </section>
    );
  }

  return (
    <Card className={cn("bg-card", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Code2 className="h-4 w-4 text-primary" />
          Autoria, Direitos Autorais e LGPD
        </CardTitle>
      </CardHeader>
      <CardContent>
        {blocks}
        {contact}
      </CardContent>
    </Card>
  );
}