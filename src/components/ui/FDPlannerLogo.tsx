import { cn } from '@/lib/utils';
import fdPlannerLogo from '@/assets/fd-planner-logo.png';
import { useBranding } from '@/hooks/useBranding';

interface FDPlannerLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  variant?: 'default' | 'icon-only';
}

export function FDPlannerLogo({ 
  size = 'md', 
  className,
  showText = true,
  variant = 'default'
}: FDPlannerLogoProps) {
  const branding = useBranding();
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20'
  };

  const textSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const subtitleSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base'
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Logo Image with animated gradient glow */}
      <div 
        className={cn(
          sizeClasses[size],
          "relative flex items-center justify-center overflow-visible",
          "transform-gpu hover:scale-105 transition-all duration-300 group"
        )}
      >
        {/* Subtle slate/steel glow behind logo */}
        <div 
          className="absolute inset-0 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))',
            backgroundSize: '200% 200%',
            animation: 'gradient-shift 4s ease-in-out infinite',
          }}
        />
        
        {/* Logo image */}
        <img 
          src={fdPlannerLogo} 
          alt="FD-Planner Logo" 
          className="h-full w-full object-contain relative z-10"
        />
      </div>
      
      {/* Text with gradient animation */}
      {showText && variant === 'default' && (
        <div className="flex flex-col">
          <span 
            className={cn(
              "font-display font-bold tracking-tight",
              textSizeClasses[size],
              "bg-gradient-to-r from-sidebar-foreground via-primary to-sidebar-foreground bg-clip-text",
              "bg-[length:200%_auto]"
            )}
            style={{
              animation: 'gradient-shift 4s ease-in-out infinite',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {branding.appName}
          </span>
          <span className={cn(
            "text-sidebar-foreground/60 font-medium -mt-0.5",
            subtitleSizeClasses[size]
          )}>
            {branding.tagline}
          </span>
        </div>
      )}

      {/* Keyframes for animations */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}

// Alias for backward compatibility
export { FDPlannerLogo as ZorynflowLogo };
