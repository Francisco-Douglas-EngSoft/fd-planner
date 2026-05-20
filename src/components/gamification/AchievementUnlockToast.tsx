import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star } from 'lucide-react';

interface AchievementUnlockToastProps {
  show: boolean;
  name: string;
  xp: number;
  onClose: () => void;
}

export function AchievementUnlockToast({ show, name, xp, onClose }: AchievementUnlockToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed top-6 right-6 z-[250] pointer-events-auto"
          initial={{ x: 300, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 300, opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          onClick={onClose}
        >
          <div className="bg-card border-2 border-primary/50 rounded-2xl shadow-2xl p-4 flex items-center gap-4 cursor-pointer min-w-[280px]">
            <motion.div
              className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0"
              animate={{ rotate: [0, -15, 15, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Trophy className="h-6 w-6 text-primary-foreground" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Star className="h-3 w-3 text-warning fill-warning" />
                <span className="text-[10px] font-bold text-warning uppercase tracking-wider">Conquista!</span>
              </div>
              <p className="font-semibold text-sm truncate">{name}</p>
              <p className="text-xs text-muted-foreground">+{xp} XP ganhos</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
