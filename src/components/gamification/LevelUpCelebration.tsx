import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getLevelTier } from './XPProgressBar';

interface LevelUpCelebrationProps {
  level: number;
  show: boolean;
  onClose: () => void;
}

export function LevelUpCelebration({ level, show, onClose }: LevelUpCelebrationProps) {
  const tier = getLevelTier(level);
  const Icon = tier.icon;

  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Particles */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary"
              initial={{ 
                x: 0, y: 0, opacity: 1, scale: 1,
              }}
              animate={{
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.3 }}
              style={{
                left: '50%',
                top: '50%',
                backgroundColor: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--success))'][i % 4],
              }}
            />
          ))}

          {/* Central badge */}
          <motion.div
            className="bg-card border-2 border-primary shadow-2xl rounded-3xl p-8 text-center pointer-events-auto cursor-pointer"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            onClick={onClose}
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Icon className={`h-16 w-16 mx-auto mb-3 ${tier.color}`} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <Sparkles className="h-4 w-4 text-warning" />
                <span className="text-xs font-semibold text-warning uppercase tracking-wider">Level Up!</span>
                <Sparkles className="h-4 w-4 text-warning" />
              </div>
              <h2 className="text-3xl font-bold mb-1">Nível {level}</h2>
              <p className="text-sm text-muted-foreground">{tier.title}</p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
