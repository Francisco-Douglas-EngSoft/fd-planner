/**
 * Security Utilities Module
 * Provides various security-related helper functions
 */

import DOMPurify from 'dompurify';
import { z } from 'zod';

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove any potential script tags and dangerous attributes
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML allowed for plain text
    ALLOWED_ATTR: [],
  }).trim();
}

/**
 * Sanitizes HTML content with restricted tags
 */
export function sanitizeHtmlContent(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'span'
    ],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
    FORBID_ATTR: ['style', 'onclick', 'onerror', 'onload'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Validates and sanitizes URLs
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Encodes string for safe URL parameter usage
 */
export function encodeUrlParam(param: string): string {
  return encodeURIComponent(sanitizeInput(param));
}

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validates UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates that a value is not a common injection pattern
 */
export function containsInjectionPatterns(value: string): boolean {
  const patterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:/gi,
    /vbscript:/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /expression\s*\(/gi,
    /url\s*\(/gi,
  ];
  
  return patterns.some((pattern) => pattern.test(value));
}

/**
 * Validates SQL injection patterns (for client-side warning only)
 */
export function containsSQLInjection(value: string): boolean {
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(--|;|\/\*|\*\/)/g,
    /(['"])\s*OR\s+\1/gi,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
  ];
  
  return patterns.some((pattern) => pattern.test(value));
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Rate limiting tracker for client-side protection
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remainingAttempts: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired entry
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetIn: windowMs };
  }
  
  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remainingAttempts: 0,
      resetIn: entry.resetTime - now,
    };
  }
  
  entry.count++;
  return {
    allowed: true,
    remainingAttempts: maxAttempts - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Clears rate limit for a specific key
 */
export function clearRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

// ============================================
// CSP & NONCE
// ============================================

/**
 * Generates a nonce for inline scripts (CSP compatibility)
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)));
}

// ============================================
// PASSWORD VALIDATION
// ============================================

/**
 * Checks if a password meets security requirements
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
  score: number;
} {
  const errors: string[] = [];
  let score = 0;
  
  if (password.length >= 8) {
    score += 1;
  } else {
    errors.push('Mínimo de 8 caracteres');
  }
  
  if (password.length >= 12) score += 1;
  
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    errors.push('Pelo menos uma letra maiúscula');
  }
  
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    errors.push('Pelo menos uma letra minúscula');
  }
  
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    errors.push('Pelo menos um número');
  }
  
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    errors.push('Pelo menos um caractere especial');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    score: Math.min(score, 5), // Max score of 5
  };
}

// ============================================
// DATA MASKING
// ============================================

/**
 * Masks sensitive data for display
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) {
    return '*'.repeat(data?.length || 0);
  }
  
  const masked = '*'.repeat(data.length - visibleChars);
  return masked + data.slice(-visibleChars);
}

/**
 * Masks email for privacy
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';
  
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length);
  
  const [domainName, tld] = domain.split('.');
  const maskedDomain = domainName.length > 2
    ? domainName[0] + '*'.repeat(domainName.length - 2) + domainName[domainName.length - 1]
    : '*'.repeat(domainName.length);
  
  return `${maskedLocal}@${maskedDomain}.${tld}`;
}

// ============================================
// COMMON VALIDATION SCHEMAS (Zod)
// ============================================

/**
 * Common validation schemas for reuse across the application
 */
export const validationSchemas = {
  // Email validation
  email: z.string()
    .trim()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  
  // Password validation
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(128, 'Senha muito longa')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  
  // Simple text (no HTML)
  plainText: (minLength = 1, maxLength = 500) => 
    z.string()
      .trim()
      .min(minLength, `Mínimo de ${minLength} caractere(s)`)
      .max(maxLength, `Máximo de ${maxLength} caracteres`)
      .refine(val => !containsInjectionPatterns(val), 'Conteúdo inválido'),
  
  // Title/Name fields
  title: z.string()
    .trim()
    .min(1, 'Título é obrigatório')
    .max(200, 'Título muito longo')
    .refine(val => !containsInjectionPatterns(val), 'Título contém caracteres inválidos'),
  
  // Description fields
  description: z.string()
    .trim()
    .max(2000, 'Descrição muito longa')
    .optional(),
  
  // UUID validation
  uuid: z.string()
    .refine(val => isValidUUID(val), 'ID inválido'),
  
  // URL validation
  url: z.string()
    .trim()
    .url('URL inválida')
    .refine(val => {
      try {
        const parsed = new URL(val);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    }, 'Apenas URLs http/https são permitidas')
    .optional(),
  
  // Date validation
  date: z.string()
    .refine(val => !isNaN(Date.parse(val)), 'Data inválida'),
  
  // Number within range
  positiveNumber: (max = 999999) =>
    z.number()
      .min(0, 'Valor deve ser positivo')
      .max(max, `Valor máximo: ${max}`),
  
  // Rating (1-5 or 1-10)
  rating: (max = 5) =>
    z.number()
      .min(1, 'Mínimo: 1')
      .max(max, `Máximo: ${max}`),
};

// ============================================
// SECURITY HEADERS CHECK (Client-side info only)
// ============================================

/**
 * Checks if the page has recommended security headers
 * Note: This is for informational purposes only - headers are set server-side
 */
export function getSecurityHeadersStatus(): Record<string, boolean> {
  // These checks are limited on client-side
  // Real security headers must be verified via HTTP response
  return {
    csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
    xContentType: !!document.querySelector('meta[http-equiv="X-Content-Type-Options"]'),
    xFrame: !!document.querySelector('meta[http-equiv="X-Frame-Options"]'),
    referrerPolicy: !!document.querySelector('meta[name="referrer"]'),
    permissionsPolicy: !!document.querySelector('meta[http-equiv="Permissions-Policy"]'),
  };
}

// ============================================
// HTML SANITIZATION (consolidated from lib/sanitize.ts)
// ============================================

/**
 * Sanitizes rich HTML content (for notes, rich text editors)
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'span'],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
    KEEP_CONTENT: true
  });
}

// ============================================
// SECURE LOGGING (prevents sensitive data exposure)
// ============================================

/**
 * Logs data safely without exposing sensitive information
 */
export function secureLog(
  message: string, 
  data?: Record<string, unknown>,
  sensitiveKeys: string[] = ['password', 'token', 'secret', 'key', 'authorization']
): void {
  if (import.meta.env.PROD) {
    return;
  }
  
  if (!data) {
    console.log(`[DEV] ${message}`);
    return;
  }
  
  const redactedData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      const isSecret = sensitiveKeys.some(sk => 
        key.toLowerCase().includes(sk.toLowerCase())
      );
      return [key, isSecret ? '[REDACTED]' : value];
    })
  );
  
  console.log(`[DEV] ${message}`, redactedData);
}
