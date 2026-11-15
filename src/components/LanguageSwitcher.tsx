import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LANGUAGES, useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  /** `compact` mostra só o globo + sigla; `full` mostra o nome do idioma. */
  variant?: 'compact' | 'full';
  className?: string;
  align?: 'start' | 'end' | 'center';
}

export function LanguageSwitcher({ variant = 'compact', className, align = 'end' }: LanguageSwitcherProps) {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGES.find((l) => l.value === lang) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-1.5 rounded-xl px-2.5', className)}
          aria-label={t('Escolher idioma', 'Choose language')}
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-semibold">{variant === 'full' ? current.label : current.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[180px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t('Idioma', 'Language')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.value} onClick={() => setLang(l.value)} className="gap-2">
            <span aria-hidden>{l.flag}</span>
            <span className="flex-1">{l.label}</span>
            {l.value === lang && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
