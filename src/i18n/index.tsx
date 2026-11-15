/**
 * Idiomas do app (Português do Brasil e Inglês).
 *
 * Uso em componentes:  const { t } = useI18n();  t('Painel', 'Dashboard')
 * Fora do React (toasts em libs etc.):  tr('Salvo', 'Saved')
 *
 * O texto em português continua no próprio componente e a tradução fica ao lado,
 * assim nenhuma tela quebra se uma frase ainda não tiver versão em inglês.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { enUS, ptBR, type Locale } from 'date-fns/locale';

export type Language = 'pt' | 'en';

export const LANGUAGE_STORAGE_KEY = 'fdplanner_lang';
export const LANGUAGE_CHANGED_EVENT = 'fdplanner:language-changed';

export const LANGUAGES: { value: Language; label: string; short: string; flag: string }[] = [
  { value: 'pt', label: 'Português (Brasil)', short: 'PT', flag: '🇧🇷' },
  { value: 'en', label: 'English', short: 'EN', flag: '🇺🇸' },
];

function detectInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'pt' || saved === 'en') return saved;
  } catch {
    // ignore
  }
  // Padrão: português. O usuário escolhe inglês pelo seletor (fica salvo no aparelho).
  return 'pt';
}

let currentLanguage: Language = detectInitialLanguage();

/** Idioma atual (para código fora de componentes). */
export function getLanguage(): Language {
  return currentLanguage;
}

/** Tradução fora do React. Componentes devem preferir `useI18n().t` para re-renderizar ao trocar. */
export function tr(pt: string, en: string): string {
  return currentLanguage === 'en' ? en : pt;
}

export function localeTagFor(lang: Language) {
  return lang === 'en' ? 'en-US' : 'pt-BR';
}

export function dateLocaleFor(lang: Language): Locale {
  return lang === 'en' ? enUS : ptBR;
}

interface I18nValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (pt: string, en: string) => string;
  /** 'pt-BR' | 'en-US' para toLocaleDateString / Intl. */
  localeTag: string;
  /** Locale do date-fns. */
  dateLocale: Locale;
}

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(currentLanguage);

  useEffect(() => {
    currentLanguage = lang;
    document.documentElement.lang = localeTagFor(lang);
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    currentLanguage = next;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // ignore
    }
    setLangState(next);
    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: next }));
  }, []);

  // Outra aba trocou o idioma.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LANGUAGE_STORAGE_KEY && (e.newValue === 'pt' || e.newValue === 'en')) {
        currentLanguage = e.newValue;
        setLangState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (pt, en) => (lang === 'en' ? en : pt),
      localeTag: localeTagFor(lang),
      dateLocale: dateLocaleFor(lang),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

const fallback: I18nValue = {
  get lang() {
    return currentLanguage;
  },
  setLang: () => undefined,
  t: (pt, en) => tr(pt, en),
  get localeTag() {
    return localeTagFor(currentLanguage);
  },
  get dateLocale() {
    return dateLocaleFor(currentLanguage);
  },
};

export function useI18n(): I18nValue {
  return useContext(I18nContext) ?? fallback;
}
