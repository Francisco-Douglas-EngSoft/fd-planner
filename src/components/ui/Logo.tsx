import { cn } from '@/lib/utils';
import fdPlannerLogo from '@/assets/fd-planner-logo.png';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'default' | 'minimal' | 'full';
  showText?: boolean;
  className?: string;
  animated?: boolean;
  removeBackground?: boolean;
}

const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
  '2xl': 'h-28 w-28',
};

const textSizeClasses = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-3xl',
  '2xl': 'text-4xl',
};

const subtitleSizeClasses = {
  xs: 'text-[8px]',
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base',
  '2xl': 'text-lg',
};

export function Logo({ 
  size = 'md', 
  variant = 'default', 
  showText = true,
  className,
  animated = false,
  removeBackground = true,
}: LogoProps) {
  const isMinimal = variant === 'minimal';
  
  return (
    <div className={cn(
      "flex items-center gap-3",
      className
    )}>
      {/* Logo Image */}
      <div className={cn(
        "relative flex items-center justify-center rounded-full overflow-hidden",
        sizeClasses[size],
        animated && "animate-float",
        !isMinimal && "transition-transform duration-300 hover:scale-105"
      )}>
        <img 
          src={fdPlannerLogo} 
          alt="FD-Planner Logo" 
          className={cn(
            "h-full w-full object-cover rounded-full"
          )}
          style={removeBackground ? { 
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
          } : undefined}
        />
        
        {/* Shine effect */}
        {animated && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        )}
      </div>
      
      {/* Text */}
      {showText && variant !== 'minimal' && (
        <div className="flex flex-col">
          <span className={cn(
            "font-display font-bold text-gradient leading-tight",
            textSizeClasses[size]
          )}>
            FD-Planner
          </span>
          {variant === 'full' && (
            <span className={cn(
              "text-muted-foreground",
              subtitleSizeClasses[size]
            )}>
              FD-Planner
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Icon-only version for favicons, buttons, etc.
export function LogoIcon({ 
  size = 'md', 
  className,
  animated = false,
  removeBackground = true,
}: Pick<LogoProps, 'size' | 'className' | 'animated' | 'removeBackground'>) {
  return (
    <div className={cn(
      "relative flex items-center justify-center rounded-full overflow-hidden",
      sizeClasses[size],
      animated && "animate-pulse-soft",
      className
    )}>
      <img 
        src={fdPlannerLogo} 
        alt="FD-Planner" 
        className={cn(
          "h-full w-full object-cover rounded-full"
        )}
        style={removeBackground ? { 
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
        } : undefined}
      />
    </div>
  );
}

// Monochrome version using CSS filters
export function LogoMono({ 
  size = 'md', 
  className,
  inverted = false,
}: Pick<LogoProps, 'size' | 'className'> & { inverted?: boolean }) {
  return (
    <div className={cn(
      "relative flex items-center justify-center rounded-full overflow-hidden",
      sizeClasses[size],
      className
    )}>
      <img 
        src={fdPlannerLogo} 
        alt="FD-Planner" 
        className={cn(
          "h-full w-full object-cover rounded-full",
          inverted ? "brightness-0 invert" : "grayscale"
        )}
      />
    </div>
  );
}