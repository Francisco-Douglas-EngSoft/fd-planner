/**
 * CSRF Protection Module - Enhanced for LGPD/GDPR Compliance
 * Provides comprehensive token generation and validation for all state-modifying operations
 */

const CSRF_TOKEN_KEY = 'fdplanner_csrf_token';
const CSRF_TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes (more secure)
const CSRF_FORM_TOKEN_KEY = 'fdplanner_form_token';

interface CSRFToken {
  token: string;
  expiresAt: number;
  fingerprint: string;
}

/**
 * Generates a cryptographically secure random token
 */
function generateRandomToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a browser fingerprint for additional token validation
 */
function createFingerprint(): string {
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');
  
  // Simple hash function for fingerprinting
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Gets or creates a CSRF token
 * Tokens are stored in sessionStorage and expire after 30 minutes
 */
export function getCSRFToken(): string {
  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    const currentFingerprint = createFingerprint();
    
    if (stored) {
      const parsed: CSRFToken = JSON.parse(stored);
      
      // Check if token is still valid and fingerprint matches
      if (parsed.expiresAt > Date.now() && parsed.fingerprint === currentFingerprint) {
        return parsed.token;
      }
    }
    
    // Generate new token
    const newToken: CSRFToken = {
      token: generateRandomToken(),
      expiresAt: Date.now() + CSRF_TOKEN_EXPIRY,
      fingerprint: currentFingerprint,
    };
    
    sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(newToken));
    return newToken.token;
  } catch {
    // Fallback for environments without sessionStorage
    return generateRandomToken();
  }
}

/**
 * Generates a unique form token for individual form submissions
 * Provides per-form CSRF protection
 */
export function generateFormToken(): string {
  const formToken = generateRandomToken(16);
  const formTokens = getStoredFormTokens();
  
  formTokens.push({
    token: formToken,
    createdAt: Date.now(),
  });
  
  // Keep only last 10 form tokens to prevent memory bloat
  const recentTokens = formTokens.slice(-10);
  sessionStorage.setItem(CSRF_FORM_TOKEN_KEY, JSON.stringify(recentTokens));
  
  return formToken;
}

interface StoredFormToken {
  token: string;
  createdAt: number;
}

function getStoredFormTokens(): StoredFormToken[] {
  try {
    const stored = sessionStorage.getItem(CSRF_FORM_TOKEN_KEY);
    if (!stored) return [];
    
    const tokens: StoredFormToken[] = JSON.parse(stored);
    // Filter out tokens older than 30 minutes
    return tokens.filter(t => Date.now() - t.createdAt < CSRF_TOKEN_EXPIRY);
  } catch {
    return [];
  }
}

/**
 * Validates a form token (single-use)
 */
export function validateFormToken(token: string): boolean {
  try {
    const formTokens = getStoredFormTokens();
    const tokenIndex = formTokens.findIndex(t => t.token === token);
    
    if (tokenIndex === -1) {
      return false;
    }
    
    // Remove used token (single-use protection)
    formTokens.splice(tokenIndex, 1);
    sessionStorage.setItem(CSRF_FORM_TOKEN_KEY, JSON.stringify(formTokens));
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a CSRF token
 */
export function validateCSRFToken(token: string): boolean {
  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    
    if (!stored) {
      return false;
    }
    
    const parsed: CSRFToken = JSON.parse(stored);
    const currentFingerprint = createFingerprint();
    
    // Token must match, not be expired, and fingerprint must match
    return (
      parsed.token === token && 
      parsed.expiresAt > Date.now() &&
      parsed.fingerprint === currentFingerprint
    );
  } catch {
    return false;
  }
}

/**
 * Refreshes the CSRF token
 * Call this after successful form submission to prevent token reuse attacks
 */
export function refreshCSRFToken(): string {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
  return getCSRFToken();
}

/**
 * Clears all CSRF tokens (for logout)
 */
export function clearAllCSRFTokens(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
  sessionStorage.removeItem(CSRF_FORM_TOKEN_KEY);
}

/**
 * Hook to use CSRF protection in forms
 */
export function useCSRFToken() {
  return {
    token: getCSRFToken(),
    formToken: generateFormToken(),
    validate: validateCSRFToken,
    validateForm: validateFormToken,
    refresh: refreshCSRFToken,
    clear: clearAllCSRFTokens,
  };
}

/**
 * Creates CSRF meta tag for forms (for non-React forms)
 */
export function getCSRFMetaContent(): { name: string; content: string } {
  return {
    name: 'csrf-token',
    content: getCSRFToken(),
  };
}
