import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  clearCustomTheme as clearTheme, 
  initializeCustomTheme,
  useHasActiveCustomTheme 
} from '@/hooks/useCustomTheme';

type Theme = 'light' | 'dark';
type LightVariant = 'crystal' | 'ivory' | 'arctic' | 'verdant';
type DarkVariant = 'aurora' | 'ocean' | 'neon' | 'royal' | 'graphite';

interface ThemeContextType {
  theme: Theme;
  lightVariant: LightVariant;
  darkVariant: DarkVariant;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setLightVariant: (variant: LightVariant) => void;
  setDarkVariant: (variant: DarkVariant) => void;
  clearCustomTheme: () => void;
  hasActiveCustomTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const lightVariants: { id: LightVariant; name: string; description: string }[] = [
  { id: 'crystal', name: 'Crystal', description: 'Slate & Platinum — grafite frio, platina e azul gelo' },
  { id: 'ivory', name: 'Ivory', description: 'Suave e minimalista com tons dourados' },
  { id: 'arctic', name: 'Arctic', description: 'Profissional com azuis frios' },
  { id: 'verdant', name: 'Verdant', description: 'Barra lateral verde fresca e moderna' },
];

export const darkVariants: { id: DarkVariant; name: string; description: string }[] = [
  { id: 'aurora', name: 'Aurora Borealis', description: 'Luzes místicas do norte com verdes e roxos etéreos' },
  { id: 'ocean', name: 'Deep Ocean', description: 'Profundezas oceânicas com bioluminescência azul' },
  { id: 'neon', name: 'Neon Tokyo', description: 'Cyberpunk moderno com neon rosa e azul elétrico' },
  { id: 'royal', name: 'Royal Purple', description: 'Luxo e elegância com roxos profundos e dourado' },
  { id: 'graphite', name: 'Slate & Platinum', description: 'Slate & Platinum — grafite frio com platina e azul gelo' },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fdplanner-theme') as Theme;
      if (stored) return stored;
      return 'dark';
    }
    return 'dark';
  });

  const [lightVariant, setLightVariantState] = useState<LightVariant>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fdplanner-light-variant') as LightVariant;
      if (stored && ['crystal', 'ivory', 'arctic', 'verdant'].includes(stored)) return stored;
    }
    return 'crystal';
  });

  const [darkVariant, setDarkVariantState] = useState<DarkVariant>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fdplanner-dark-variant') as DarkVariant;
      if (stored && ['aurora', 'ocean', 'neon', 'royal', 'graphite'].includes(stored)) return stored;
    }
    return 'graphite';
  });

  // Use the reactive hook for custom theme state
  const hasActiveCustomTheme = useHasActiveCustomTheme();

  // Initialize custom theme on mount
  useEffect(() => {
    initializeCustomTheme();
  }, []);

  // Apply theme classes and handle custom theme
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all theme classes
    root.classList.remove(
      'light', 'dark', 
      'light-crystal', 'light-ivory', 'light-arctic', 'light-verdant',
      'dark-aurora', 'dark-ocean', 'dark-neon', 'dark-royal',
      // Legacy classes
      'light-ocean', 'light-rose', 'light-default',
      'dark-cosmic', 'dark-obsidian', 'dark-midnight', 'dark-elegant', 'dark-matte', 'dark-carbon', 'dark-quantum', 'dark-terminal', 'dark-graphite',
      'dark-nord', 'dark-dracula', 'dark-monokai', 'dark-aurora', 'dark-ocean', 'dark-fdplanner', 'dark-default'
    );
    
    // Apply base theme class
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.add(`dark-${darkVariant}`);
    } else {
      root.classList.add('light');
      root.classList.add(`light-${lightVariant}`);
    }
    
    localStorage.setItem('fdplanner-theme', theme);

    // If custom theme is active, re-initialize it after theme class changes
    // This ensures custom theme overrides the variant
    if (hasActiveCustomTheme) {
      initializeCustomTheme();
    }
  }, [theme, darkVariant, lightVariant, hasActiveCustomTheme]);

  useEffect(() => {
    localStorage.setItem('fdplanner-dark-variant', darkVariant);
  }, [darkVariant]);

  useEffect(() => {
    localStorage.setItem('fdplanner-light-variant', lightVariant);
  }, [lightVariant]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    // Force re-apply theme classes even if same theme (e.g., after clearing custom theme)
    // by directly re-applying classes
    const root = window.document.documentElement;
    root.classList.remove(
      'light', 'dark',
      'light-crystal', 'light-ivory', 'light-arctic', 'light-verdant',
      'dark-aurora', 'dark-ocean', 'dark-neon', 'dark-royal',
      'light-ocean', 'light-rose', 'light-default',
      'dark-cosmic', 'dark-obsidian', 'dark-midnight', 'dark-elegant', 'dark-matte', 'dark-carbon', 'dark-quantum', 'dark-terminal', 'dark-graphite',
      'dark-nord', 'dark-dracula', 'dark-monokai', 'dark-fdplanner', 'dark-default'
    );
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.classList.add(`dark-${darkVariant}`);
    } else {
      root.classList.add('light');
      root.classList.add(`light-${lightVariant}`);
    }
    localStorage.setItem('fdplanner-theme', newTheme);
  };

  const setLightVariant = (variant: LightVariant) => {
    setLightVariantState(variant);
  };

  const setDarkVariant = (variant: DarkVariant) => {
    setDarkVariantState(variant);
  };

  // Clear custom theme - wrapper for the centralized function
  const clearCustomTheme = () => {
    clearTheme();
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      lightVariant, 
      darkVariant, 
      toggleTheme, 
      setTheme, 
      setLightVariant, 
      setDarkVariant,
      clearCustomTheme,
      hasActiveCustomTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
