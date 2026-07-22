import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

// ============ Types ============
export interface GradientConfig {
  enabled: boolean;
  direction: string;
  color1: string;
  color2: string;
}

export interface ShadowConfig {
  enabled: boolean;
  type: 'subtle' | 'medium' | 'strong' | 'glow' | 'custom';
  color: string;
  blur: number;
  spread: number;
  offsetX: number;
  offsetY: number;
  inset?: boolean;
}

export interface TextShadowConfig {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface MultipleShadowConfig {
  enabled: boolean;
  shadows: ShadowConfig[];
}

export interface CustomThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  success: string;
  warning: string;
  destructive: string;
  border: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarAccent: string;
  sidebarBorder: string;
}

export interface CustomThemeGradients {
  cardGradient: GradientConfig;
  primaryGradient: GradientConfig;
  sidebarGradient: GradientConfig;
}

export interface CustomThemeShadows {
  cardShadow: ShadowConfig;
  textShadow?: TextShadowConfig;
  buttonShadow?: ShadowConfig;
}

export interface CustomTheme {
  name: string;
  colors: CustomThemeColors;
  gradients?: CustomThemeGradients;
  shadows?: CustomThemeShadows;
}

export interface SavedTheme extends CustomTheme {
  id: string;
  createdAt: string;
  gradients?: CustomThemeGradients;
  shadows?: CustomThemeShadows;
}

// ============ Constants ============
const ACTIVE_THEME_KEY = 'fdplanner_active_theme';
const SAVED_THEMES_KEY = 'fdplanner_custom_themes';

// Migration: Move data from old keys to new keys (run once)
(() => {
  const oldActiveKey = 'fdplanner-active-theme';
  const oldSavedKey = 'fdplanner-custom-themes';
  
  try {
    const oldActive = localStorage.getItem(oldActiveKey);
    if (oldActive && !localStorage.getItem(ACTIVE_THEME_KEY)) {
      localStorage.setItem(ACTIVE_THEME_KEY, oldActive);
      localStorage.removeItem(oldActiveKey);
    }
    
    const oldSaved = localStorage.getItem(oldSavedKey);
    if (oldSaved && !localStorage.getItem(SAVED_THEMES_KEY)) {
      localStorage.setItem(SAVED_THEMES_KEY, oldSaved);
      localStorage.removeItem(oldSavedKey);
    }
  } catch {
    // Ignore migration errors
  }
})();

// ============ Utility Functions ============
export function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';

  const r = Number.parseInt(result[1], 16) / 255;
  const g = Number.parseInt(result[2], 16) / 255;
  const b = Number.parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function generateGradientCSS(gradient: GradientConfig): string {
  if (!gradient.enabled) return 'none';
  return `linear-gradient(${gradient.direction}, ${gradient.color1}, ${gradient.color2})`;
}

export function generateShadowCSS(shadow: ShadowConfig): string {
  if (!shadow.enabled) return 'none';
  
  // Convert hex color to rgba with opacity
  const hexToRgba = (hex: string, opacity: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0, 0, 0, ${opacity})`;
    
    const r = Number.parseInt(result[1], 16);
    const g = Number.parseInt(result[2], 16);
    const b = Number.parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  
  const opacity = shadow.type === 'glow' ? 0.6 : 0.25;
  const color = shadow.color.startsWith('#') ? hexToRgba(shadow.color, opacity) : shadow.color;
  const insetStr = shadow.inset ? 'inset ' : '';
  
  return `${insetStr}${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${color}`;
}

export function generateTextShadowCSS(shadow: TextShadowConfig): string {
  if (!shadow.enabled) return 'none';
  return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color}40`;
}

// ============ Color Keys for CSS Variables ============
const ALL_COLOR_KEYS = [
  'background', 'foreground', 'card', 'card-foreground',
  'primary', 'primary-foreground', 'secondary', 'secondary-foreground',
  'muted', 'muted-foreground', 'accent', 'accent-foreground',
  'success', 'warning', 'destructive', 'border',
  'sidebar-background', 'sidebar-foreground', 'sidebar-primary',
  'sidebar-accent', 'sidebar-border'
];

// ============ Theme Application Functions ============

/**
 * Apply all custom theme properties to the document
 */
export function applyCustomTheme(theme: CustomTheme): void {
  const root = document.documentElement;

  // Apply colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    const hsl = hexToHsl(value);
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssKey}`, hsl);
  });

  // Apply gradients
  if (theme.gradients) {
    const { cardGradient, primaryGradient, sidebarGradient } = theme.gradients;

    if (cardGradient?.enabled) {
      root.style.setProperty('--gradient-card', generateGradientCSS(cardGradient));
      root.dataset.gradientCard = 'true';
    } else {
      root.style.removeProperty('--gradient-card');
      delete root.dataset.gradientCard;
    }

    if (primaryGradient?.enabled) {
      root.style.setProperty('--gradient-primary', generateGradientCSS(primaryGradient));
      root.dataset.gradientPrimary = 'true';
    } else {
      root.style.removeProperty('--gradient-primary');
      delete root.dataset.gradientPrimary;
    }

    if (sidebarGradient?.enabled) {
      root.style.setProperty('--gradient-sidebar', generateGradientCSS(sidebarGradient));
      root.dataset.gradientSidebar = 'true';
    } else {
      root.style.removeProperty('--gradient-sidebar');
      delete root.dataset.gradientSidebar;
    }
  }

  // Apply shadows
  if (theme.shadows?.cardShadow) {
    if (theme.shadows.cardShadow.enabled) {
      root.style.setProperty('--shadow-card', generateShadowCSS(theme.shadows.cardShadow));
    } else {
      root.style.removeProperty('--shadow-card');
    }
  }

  if (theme.shadows?.textShadow) {
    if (theme.shadows.textShadow.enabled) {
      root.style.setProperty('--shadow-text', generateTextShadowCSS(theme.shadows.textShadow));
    } else {
      root.style.removeProperty('--shadow-text');
    }
  }

  if (theme.shadows?.buttonShadow) {
    if (theme.shadows.buttonShadow.enabled) {
      root.style.setProperty('--shadow-button', generateShadowCSS(theme.shadows.buttonShadow));
    } else {
      root.style.removeProperty('--shadow-button');
    }
  }

  // Save to localStorage
  localStorage.setItem(ACTIVE_THEME_KEY, JSON.stringify(theme));
  
  // Dispatch event for reactive updates
  window.dispatchEvent(new CustomEvent('custom-theme-change', { detail: { active: true } }));
}

/**
 * Remove all custom theme properties from the document
 */
export function clearCustomTheme(): void {
  const root = document.documentElement;

  // Remove all color properties
  ALL_COLOR_KEYS.forEach(key => {
    root.style.removeProperty(`--${key}`);
  });

  // Remove gradient properties
  root.style.removeProperty('--gradient-card');
  root.style.removeProperty('--gradient-primary');
  root.style.removeProperty('--gradient-sidebar');

  // Remove shadow properties
  root.style.removeProperty('--shadow-card');
  root.style.removeProperty('--shadow-text');
  root.style.removeProperty('--shadow-button');

  // Remove data attributes
  delete root.dataset.gradientCard;
  delete root.dataset.gradientPrimary;
  delete root.dataset.gradientSidebar;

  // Remove from localStorage
  localStorage.removeItem(ACTIVE_THEME_KEY);
  
  // Dispatch event for reactive updates
  window.dispatchEvent(new CustomEvent('custom-theme-change', { detail: { active: false } }));
}

/**
 * Get the current active custom theme from localStorage
 */
export function getActiveCustomTheme(): CustomTheme | null {
  try {
    const stored = localStorage.getItem(ACTIVE_THEME_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Check if there's an active custom theme
 */
export function hasActiveCustomTheme(): boolean {
  return !!localStorage.getItem(ACTIVE_THEME_KEY);
}

/**
 * Get all saved themes from localStorage
 */
export function getSavedThemes(): SavedTheme[] {
  try {
    const stored = localStorage.getItem(SAVED_THEMES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed;
    }
  } catch (e) {
    console.error('[Theme Debug] getSavedThemes - parse error:', e);
  }
  return [];
}

// ============ Reactive Hook for Active Theme State ============

/**
 * Save themes to localStorage and notify listeners
 */
export function saveSavedThemes(themes: SavedTheme[]): void {
  localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(themes));
  window.dispatchEvent(new CustomEvent('saved-themes-change'));
}

// Subscribe to active theme changes
function subscribeActive(callback: () => void): () => void {
  const handleChange = () => callback();
  window.addEventListener('custom-theme-change', handleChange);
  window.addEventListener('storage', handleChange);
  
  return () => {
    window.removeEventListener('custom-theme-change', handleChange);
    window.removeEventListener('storage', handleChange);
  };
}

function getActiveSnapshot(): boolean {
  return hasActiveCustomTheme();
}

/**
 * Hook to reactively check if a custom theme is active
 */
export function useHasActiveCustomTheme(): boolean {
  return useSyncExternalStore(subscribeActive, getActiveSnapshot, getActiveSnapshot);
}

/**
 * Hook to get saved themes reactively using useState + events for reliability
 */
export function useSavedThemes(): SavedTheme[] {
  const [themes, setThemes] = useState<SavedTheme[]>(() => {
    return getSavedThemes();
  });

  useEffect(() => {
    // Re-read on mount to ensure fresh data
    const fresh = getSavedThemes();
    setThemes(fresh);

    const handleChange = () => {
      const updated = getSavedThemes();
      setThemes(updated);
    };

    window.addEventListener('saved-themes-change', handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
      window.removeEventListener('saved-themes-change', handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  return themes;
}

/**
 * Hook to get the active custom theme reactively
 */
export function useActiveCustomTheme(): CustomTheme | null {
  const hasTheme = useHasActiveCustomTheme();
  
  if (!hasTheme) return null;
  return getActiveCustomTheme();
}

/**
 * Hook that provides theme management functions
 */
export function useCustomThemeManager() {
  const isActive = useHasActiveCustomTheme();
  const activeTheme = useActiveCustomTheme();
  const savedThemes = useSavedThemes(); // Use reactive hook

  const apply = useCallback((theme: CustomTheme) => {
    applyCustomTheme(theme);
  }, []);

  const clear = useCallback(() => {
    clearCustomTheme();
  }, []);

  const saveTheme = useCallback((theme: SavedTheme) => {
    const themes = getSavedThemes();
    const existingIndex = themes.findIndex(t => t.id === theme.id);
    
    if (existingIndex >= 0) {
      themes[existingIndex] = theme;
    } else {
      themes.push(theme);
    }
    
    saveSavedThemes(themes);
  }, []);

  const deleteTheme = useCallback((themeId: string) => {
    const themes = getSavedThemes().filter(t => t.id !== themeId);
    saveSavedThemes(themes);
  }, []);

  return {
    isActive,
    activeTheme,
    savedThemes,
    apply,
    clear,
    saveTheme,
    deleteTheme,
  };
}

// ============ Initialize Theme on App Load ============
export function initializeCustomTheme(): void {
  const theme = getActiveCustomTheme();
  if (theme) {
    // Re-apply the theme to ensure CSS variables are set
    const root = document.documentElement;

    // Apply colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      const hsl = hexToHsl(value);
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssKey}`, hsl);
    });

    // Apply gradients
    if (theme.gradients) {
      const { cardGradient, primaryGradient, sidebarGradient } = theme.gradients;

      if (cardGradient?.enabled) {
        root.style.setProperty('--gradient-card', generateGradientCSS(cardGradient));
        root.dataset.gradientCard = 'true';
      }

      if (primaryGradient?.enabled) {
        root.style.setProperty('--gradient-primary', generateGradientCSS(primaryGradient));
        root.dataset.gradientPrimary = 'true';
      }

      if (sidebarGradient?.enabled) {
        root.style.setProperty('--gradient-sidebar', generateGradientCSS(sidebarGradient));
        root.dataset.gradientSidebar = 'true';
      }
    }

    // Apply shadows
    if (theme.shadows?.cardShadow?.enabled) {
      root.style.setProperty('--shadow-card', generateShadowCSS(theme.shadows.cardShadow));
    }
    if (theme.shadows?.textShadow?.enabled) {
      root.style.setProperty('--shadow-text', generateTextShadowCSS(theme.shadows.textShadow));
    }
    if (theme.shadows?.buttonShadow?.enabled) {
      root.style.setProperty('--shadow-button', generateShadowCSS(theme.shadows.buttonShadow));
    }
  }
}
