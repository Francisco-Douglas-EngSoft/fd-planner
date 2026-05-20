import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

// ============ Types ============
export interface BrandingConfig {
  appName: string;
  tagline: string;
}

// ============ Constants ============
const BRANDING_KEY = 'fdplanner-branding';

const DEFAULT_BRANDING: BrandingConfig = {
  appName: 'FD-Planner',
  tagline: 'FD-Planner',
};

// ============ Store for reactive updates ============
const listeners: Set<() => void> = new Set();
let cachedBranding: BrandingConfig | null = null;

function notifyListeners() {
  cachedBranding = null; // Invalidate cache
  listeners.forEach(listener => listener());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  
  const handleStorage = (e: StorageEvent) => {
    if (e.key === BRANDING_KEY) {
      notifyListeners();
    }
  };
  
  window.addEventListener('storage', handleStorage);
  window.addEventListener('branding-change', callback);
  
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('branding-change', callback);
  };
}

function getSnapshot(): BrandingConfig {
  if (cachedBranding) return cachedBranding;
  
  try {
    const stored = localStorage.getItem(BRANDING_KEY);
    if (stored) {
      cachedBranding = JSON.parse(stored);
      return cachedBranding!;
    }
  } catch {
    // Ignore parse errors
  }
  
  cachedBranding = DEFAULT_BRANDING;
  return cachedBranding;
}

// ============ Public API ============

/**
 * Get the current branding configuration
 */
export function getBranding(): BrandingConfig {
  return getSnapshot();
}

/**
 * Update the branding configuration
 */
export function setBranding(config: Partial<BrandingConfig>): void {
  const current = getBranding();
  const updated = { ...current, ...config };
  
  localStorage.setItem(BRANDING_KEY, JSON.stringify(updated));
  cachedBranding = updated;
  
  // Update document title
  document.title = `${updated.appName} - ${updated.tagline}`;
  
  // Dispatch event for reactive updates
  window.dispatchEvent(new CustomEvent('branding-change', { detail: updated }));
  notifyListeners();
}

/**
 * Reset branding to defaults
 */
export function resetBranding(): void {
  localStorage.removeItem(BRANDING_KEY);
  cachedBranding = null;
  
  document.title = `${DEFAULT_BRANDING.appName} - ${DEFAULT_BRANDING.tagline}`;
  
  window.dispatchEvent(new CustomEvent('branding-change', { detail: DEFAULT_BRANDING }));
  notifyListeners();
}

/**
 * Hook to get reactive branding configuration
 */
export function useBranding(): BrandingConfig {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Hook to manage branding with update functions
 */
export function useBrandingManager() {
  const branding = useBranding();

  const update = useCallback((config: Partial<BrandingConfig>) => {
    setBranding(config);
  }, []);

  const reset = useCallback(() => {
    resetBranding();
  }, []);

  return {
    branding,
    update,
    reset,
    isDefault: branding.appName === DEFAULT_BRANDING.appName && 
               branding.tagline === DEFAULT_BRANDING.tagline,
  };
}

/**
 * Initialize branding on app load (update document title)
 */
export function initializeBranding(): void {
  const branding = getBranding();
  document.title = `${branding.appName} - ${branding.tagline}`;
}
