import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LANGUAGES, useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  /** `compact` mostra só o globo + sigla; `full` mostra o nome do idioma. */
  variant?: 'compact' | 'full';
  className?: string;
  align?: 'start' | 'end' | 'center';
}

/** Um clique troca o idioma na hora (Português ⇄ English). */
export function LanguageSwitcher({ variant = 'compact', className, align = 'end' }: LanguageSwitcherProps) {
  const { lang, setLang } = useI18n();
  const current = LANGUAGES.find((l) => l.value === lang) ?? LANGUAGES[0];
  const next = LANGUAGES.find((l) => l.value !== lang) ?? LANGUAGES[0];
  const hint = next.value === 'en' ? 'Switch to English' : 'Mudar para Português';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-1.5 rounded-xl px-2.5', className)}
          onClick={() => setLang(next.value)}
          aria-label={hint}
          translate="no"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-semibold">{variant === 'full' ? current.label : current.short}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side={align === 'start' ? 'right' : 'bottom'} translate="no">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}
