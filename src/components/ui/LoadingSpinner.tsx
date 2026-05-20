import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  /** Whether to display as full page centered */
  fullPage?: boolean;
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Text to display below spinner */
  text?: string;
}

const sizeClasses = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

const containerClasses = {
  fullPage: 'flex items-center justify-center min-h-[60vh]',
  inline: 'flex items-center justify-center h-64',
};

export function LoadingSpinner({ 
  fullPage = false, 
  size = 'md', 
  className,
  text 
}: LoadingSpinnerProps) {
  return (
    <div className={cn(
      fullPage ? containerClasses.fullPage : containerClasses.inline,
      className
    )}>
      <div className="flex flex-col items-center gap-3">
        <div 
          className={cn(
            "animate-spin rounded-full border-b-primary border-l-transparent border-r-transparent border-t-transparent",
            sizeClasses[size]
          )} 
        />
        {text && (
          <p className="text-sm text-muted-foreground">{text}</p>
        )}
      </div>
    </div>
  );
}
