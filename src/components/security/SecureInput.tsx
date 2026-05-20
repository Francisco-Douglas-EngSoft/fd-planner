import * as React from 'react';
import { Input } from '@/components/ui/input';
import { sanitizeInput, containsInjectionPatterns } from '@/lib/security';

interface SecureInputProps extends React.ComponentProps<"input"> {
  onSecureChange?: (sanitizedValue: string) => void;
  allowHtml?: boolean;
}

/**
 * A secure input component that sanitizes user input
 * and warns about potential injection attempts
 */
export const SecureInput = React.forwardRef<HTMLInputElement, SecureInputProps>(
  ({ onChange, onSecureChange, allowHtml = false, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const originalValue = e.target.value;
      
      // Check for injection patterns
      if (containsInjectionPatterns(originalValue)) {
        console.warn('Potential injection pattern detected in input');
      }
      
      // Sanitize the value if not allowing HTML
      const sanitizedValue = allowHtml ? originalValue : sanitizeInput(originalValue);
      
      // Call the original onChange if provided
      if (onChange) {
        // Create a new event with sanitized value
        const sanitizedEvent = {
          ...e,
          target: {
            ...e.target,
            value: sanitizedValue,
          },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(sanitizedEvent);
      }
      
      // Call the secure change handler if provided
      if (onSecureChange) {
        onSecureChange(sanitizedValue);
      }
    };

    return <Input ref={ref} onChange={handleChange} {...props} />;
  }
);

SecureInput.displayName = 'SecureInput';
