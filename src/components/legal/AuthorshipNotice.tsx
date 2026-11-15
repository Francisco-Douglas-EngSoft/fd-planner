import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copyright, ShieldCheck, Scale, Mail, Phone, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

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

const AUTHORSHIP_TEXT = {
  pt: "A arquitetura de software, a estrutura do banco de dados, o design de interface e os códigos-fonte do FD-Planner foram integralmente concebidos e desenvolvidos por Francisco Douglas, detentor exclusivo dos direitos morais e patrimoniais de autor sobre esta plataforma de estudos e desenvolvimento pessoal.",
  en: "The software architecture, database structure, interface design and source code of FD-Planner were entirely conceived and developed by Francisco Douglas, the sole holder of the moral and economic copyrights over this study and personal development platform.",
};

const COPYRIGHT_TEXT = {
  pt: "Nos termos da Lei nº 9.610/1998 (Lei de Direitos Autorais) e da Lei nº 9.609/1998 (Lei do Software), todos os direitos sobre o FD-Planner são reservados ao autor. É vedada a reprodução, distribuição, modificação, engenharia reversa ou uso não autorizado, total ou parcial, do código-fonte, da estrutura de dados e do design sem prévia autorização expressa do autor.",
  en: "Under Brazilian Law No. 9,610/1998 (Copyright Law) and Law No. 9,609/1998 (Software Law), all rights to FD-Planner are reserved to the author. Reproduction, distribution, modification, reverse engineering or unauthorized use, in whole or in part, of the source code, data structure and design is prohibited without the author's prior express permission.",
};

const LGPD_TEXT = {
  pt: "Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), o FD-Planner trata os dados de estudo e de conta de forma transparente e com finalidade específica de acompanhar o progresso do usuário. Adota medidas técnicas de segurança para proteger as informações, e o titular pode acessar, corrigir, exportar ou excluir seus dados a qualquer momento diretamente nas configurações da conta.",
  en: "In compliance with Brazil's General Data Protection Law (LGPD — Law No. 13,709/2018), FD-Planner handles study and account data transparently and for the specific purpose of tracking the user's progress. It applies technical security measures to protect information, and users can access, correct, export or delete their data at any time directly in their account settings.",
};

interface AuthorshipNoticeProps {
  readonly variant?: "section" | "card";
  readonly className?: string;
}

export function AuthorshipNotice({ variant = "card", className }: AuthorshipNoticeProps) {
  const { t, lang } = useI18n();
  const blocks = (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <Copyright className="h-4 w-4" />
          <h4 className="text-sm font-semibold text-foreground">{t("Autoria", "Authorship")}</h4>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{AUTHORSHIP_TEXT[lang]}</p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <Scale className="h-4 w-4" />
          <h4 className="text-sm font-semibold text-foreground">{t("Direitos Autorais", "Copyright")}</h4>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{COPYRIGHT_TEXT[lang]}</p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <ShieldCheck className="h-4 w-4" />
          <h4 className="text-sm font-semibold text-foreground">LGPD</h4>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{LGPD_TEXT[lang]}</p>
      </div>
    </div>
  );

  const contact = (
    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="mb-3 text-xs text-muted-foreground">
        {t("Para suporte técnico, atribuição de autoria ou contatos profissionais, o desenvolvedor", "For technical support, authorship attribution or professional contact, the developer")}
        <span className="font-medium text-foreground"> {DEVELOPER.name}</span> {t("pode ser contatado:", "can be reached at:")}
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
              {t("Autoria & Conformidade Legal", "Authorship & Legal Compliance")}
            </Badge>
            <h2 className="mb-3 text-2xl font-bold sm:text-3xl">{t("Direitos Autorais e LGPD", "Copyright & Data Protection")}</h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              {t("Propriedade intelectual, licenciamento de uso e conformidade com a legislação brasileira.", "Intellectual property, usage licensing and compliance with Brazilian law.")}
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
          {t("Autoria, Direitos Autorais e LGPD", "Authorship, Copyright & Data Protection")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {blocks}
        {contact}
      </CardContent>
    </Card>
  );
}