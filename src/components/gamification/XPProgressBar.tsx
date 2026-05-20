import { motion } from 'framer-motion';
import { Trophy, Star, Zap, Crown, Gem, Flame, Shield, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XPProgressBarProps {
  level: number;
  currentXP: number;
  requiredXP: number;
  totalXP: number;
  className?: string;
}

const levelTiers = [
  { min: 1, max: 5, title: 'Iniciante', icon: Star, color: 'text-muted-foreground', bg: 'from-muted to-muted-foreground/20' },
  { min: 6, max: 10, title: 'Aprendiz', icon: Zap, color: 'text-chart-1', bg: 'from-chart-1/20 to-chart-1/5' },
  { min: 11, max: 20, title: 'Estudante', icon: Trophy, color: 'text-chart-2', bg: 'from-chart-2/20 to-chart-2/5' },
  { min: 21, max: 35, title: 'Veterano', icon: Shield, color: 'text-chart-3', bg: 'from-chart-3/20 to-chart-3/5' },
  { min: 36, max: 50, title: 'Mestre', icon: Crown, color: 'text-chart-4', bg: 'from-chart-4/20 to-chart-4/5' },
  { min: 51, max: 75, title: 'Grão-Mestre', icon: Gem, color: 'text-primary', bg: 'from-primary/20 to-primary/5' },
  { min: 76, max: 100, title: 'Lendário', icon: Flame, color: 'text-warning', bg: 'from-warning/20 to-warning/5' },
  { min: 101, max: Infinity, title: 'Transcendente', icon: Swords, color: 'text-destructive', bg: 'from-destructive/20 to-destructive/5' },
];

export function getLevelTier(level: number) {
  return levelTiers.find(t => level >= t.min && level <= t.max) || levelTiers[0];
}

export function XPProgressBar({ level, currentXP, requiredXP, totalXP, className }: XPProgressBarProps) {
  const tier = getLevelTier(level);
  const Icon = tier.icon;
  const progress = requiredXP > 0 ? (currentXP / requiredXP) * 100 : 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Level badge + tier */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={cn(
              "relative h-14 w-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg",
              tier.bg
            )}
          >
            <Icon className={cn("h-7 w-7", tier.color)} />
            <motion.div
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold shadow-md"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              {level}
            </motion.div>
          </motion.div>
          <div>
            <motion.h3
              className="font-bold text-lg"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              {tier.title}
            </motion.h3>
            <p className="text-xs text-muted-foreground">Nível {level} • {totalXP.toLocaleString()} XP total</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{currentXP}/{requiredXP} XP</p>
          <p className="text-[10px] text-muted-foreground">Próximo nível</p>
        </div>
      </div>

      {/* XP bar */}
      <div className="relative h-4 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        />
      </div>

      {/* Next tier preview */}
      {level < 100 && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Icon className={cn("h-3 w-3", tier.color)} />
            {tier.title}
          </span>
          {(() => {
            const next = levelTiers.find(t => level < t.min);
            if (!next) return null;
            const NextIcon = next.icon;
            return (
              <span className="flex items-center gap-1">
                <NextIcon className={cn("h-3 w-3", next.color)} />
                {next.title} (Nv. {next.min})
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
}
