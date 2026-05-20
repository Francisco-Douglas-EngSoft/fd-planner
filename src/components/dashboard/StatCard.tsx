import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning';
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const variants = {
    default: 'bg-card',
    primary: 'bg-gradient-primary',
    accent: 'bg-gradient-accent',
    success: 'bg-gradient-success',
    warning: 'bg-gradient-warm',
  };

  const isGradient = variant !== 'default';

  return (
    <div
      className={cn(
        "rounded-xl p-6 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        variants[variant],
        isGradient ? 'text-primary-foreground' : 'border border-border'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className={cn(
            "text-sm font-medium",
            isGradient ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}>
            {title}
          </p>
          <p className="text-3xl font-bold font-display">{value}</p>
          {subtitle && (
            <p className={cn(
              "text-sm",
              isGradient ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trend.isPositive 
                ? isGradient ? 'text-primary-foreground' : 'text-success' 
                : 'text-destructive'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className={isGradient ? 'text-primary-foreground/70' : 'text-muted-foreground'}>vs. semana anterior</span>
            </div>
          )}
        </div>
        <div className={cn(
          "rounded-xl p-3",
          isGradient ? 'bg-white/20' : 'bg-primary/10'
        )}>
          <Icon className={cn(
            "h-6 w-6",
            isGradient ? 'text-primary-foreground' : 'text-primary'
          )} />
        </div>
      </div>
    </div>
  );
}
