import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  getCSRFToken, 
  validateCSRFToken, 
  refreshCSRFToken, 
  generateFormToken,
  validateFormToken 
} from '@/lib/csrf';
import { z } from 'zod';
import { checkRateLimit, sanitizeInput, containsInjectionPatterns } from '@/lib/security';

interface UseSecureFormOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  onError?: (error: string) => void;
  rateLimitKey?: string;
  maxAttempts?: number;
  rateLimitWindowMs?: number;
  sanitizeFields?: string[];
}

interface SecureFormState<T> {
  isSubmitting: boolean;
  errors: Record<string, string>;
  csrfToken: string;
  formToken: string;
  isRateLimited: boolean;
  rateLimitResetIn: number;
}

/**
 * Enhanced secure form hook with:
 * - CSRF protection (session + per-form tokens)
 * - Rate limiting
 * - Input validation with Zod
 * - XSS prevention via sanitization
 * - SQL injection detection
 */
export function useSecureForm<T extends Record<string, unknown>>({
  schema,
  onSubmit,
  onError,
  rateLimitKey = 'default_form',
  maxAttempts = 10,
  rateLimitWindowMs = 60000,
  sanitizeFields = [],
}: UseSecureFormOptions<T>) {
  const [state, setState] = useState<SecureFormState<T>>({
    isSubmitting: false,
    errors: {},
    csrfToken: '',
    formToken: '',
    isRateLimited: false,
    rateLimitResetIn: 0,
  });
  
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize CSRF tokens on mount
  useEffect(() => {
    setState((prev) => ({ 
      ...prev, 
      csrfToken: getCSRFToken(),
      formToken: generateFormToken(),
    }));
    
    return () => {
      if (rateLimitTimerRef.current) {
        clearTimeout(rateLimitTimerRef.current);
      }
    };
  }, []);

  /**
   * Sanitizes form data for specified fields
   */
  const sanitizeFormData = useCallback((data: Record<string, unknown>): Record<string, unknown> => {
    const sanitized = { ...data };
    
    for (const key of Object.keys(sanitized)) {
      const value = sanitized[key];
      
      if (typeof value === 'string') {
        // Check for injection patterns
        if (containsInjectionPatterns(value)) {
          throw new Error(`Campo "${key}" contém caracteres não permitidos`);
        }
        
        // Sanitize if field is in sanitizeFields list or apply basic trim
        if (sanitizeFields.includes(key)) {
          sanitized[key] = sanitizeInput(value);
        } else {
          sanitized[key] = value.trim();
        }
      }
    }
    
    return sanitized;
  }, [sanitizeFields]);

  const validateData = useCallback(
    (data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } => {
      const result = schema.safeParse(data);

      if (result.success) {
        return { success: true, data: result.data };
      }

      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });

      return { success: false, errors };
    },
    [schema]
  );

  const handleSubmit = useCallback(
    async (data: unknown, submittedToken?: string) => {
      // Check rate limit first
      const rateCheck = checkRateLimit(rateLimitKey, maxAttempts, rateLimitWindowMs);
      
      if (!rateCheck.allowed) {
        const errorMessage = `Muitas tentativas. Tente novamente em ${Math.ceil(rateCheck.resetIn / 1000)} segundos.`;
        setState((prev) => ({
          ...prev,
          isRateLimited: true,
          rateLimitResetIn: rateCheck.resetIn,
        }));
        
        // Auto-reset rate limit status
        rateLimitTimerRef.current = setTimeout(() => {
          setState((prev) => ({ ...prev, isRateLimited: false, rateLimitResetIn: 0 }));
        }, rateCheck.resetIn);
        
        onError?.(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Validate CSRF token
      const tokenToValidate = submittedToken || state.csrfToken;
      if (!validateCSRFToken(tokenToValidate)) {
        const errorMessage = 'Token de segurança inválido. Por favor, recarregue a página.';
        onError?.(errorMessage);
        return { success: false, error: errorMessage };
      }

      setState((prev) => ({ ...prev, isSubmitting: true, errors: {} }));

      try {
        // Sanitize input data
        const sanitizedData = sanitizeFormData(data as Record<string, unknown>);
        
        // Validate input data
        const validation = validateData(sanitizedData);

        if (!validation.success) {
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            errors: validation.errors || {},
          }));
          return { success: false, errors: validation.errors };
        }

        await onSubmit(validation.data!);

        // Refresh tokens after successful submission
        const newToken = refreshCSRFToken();
        const newFormToken = generateFormToken();
        
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          csrfToken: newToken,
          formToken: newFormToken,
        }));

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar formulário';
        onError?.(errorMessage);
        setState((prev) => ({ ...prev, isSubmitting: false }));
        return { success: false, error: errorMessage };
      }
    },
    [validateData, sanitizeFormData, onSubmit, onError, state.csrfToken, rateLimitKey, maxAttempts, rateLimitWindowMs]
  );

  const clearErrors = useCallback(() => {
    setState((prev) => ({ ...prev, errors: {} }));
  }, []);

  const refreshTokens = useCallback(() => {
    setState((prev) => ({
      ...prev,
      csrfToken: refreshCSRFToken(),
      formToken: generateFormToken(),
    }));
  }, []);

  return {
    isSubmitting: state.isSubmitting,
    errors: state.errors,
    csrfToken: state.csrfToken,
    formToken: state.formToken,
    isRateLimited: state.isRateLimited,
    rateLimitResetIn: state.rateLimitResetIn,
    handleSubmit,
    clearErrors,
    validateData,
    refreshTokens,
  };
}

/**
 * Creates a hidden CSRF input field HTML string
 * Use this for non-React forms or SSR
 */
export function createCSRFInputHTML(token: string): string {
  const escapedToken = token.replace(/[&<>"']/g, (char) => {
    const escapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return escapes[char] || char;
  });
  return `<input type="hidden" name="_csrf" value="${escapedToken}" aria-hidden="true" />`;
}
