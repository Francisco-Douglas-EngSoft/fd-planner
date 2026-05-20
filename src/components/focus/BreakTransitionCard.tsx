import { Coffee, Play, SkipForward, Brain, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { formatSecondsToHMS } from '@/lib/timeUtils';

interface BreakTransitionCardProps {
  isVisible: boolean;
  mode: 'break' | 'longBreak';
  breakTimeSeconds: number;
  completedSessions: number;
  onStartBreak: () => void;
  onSkipBreak: () => void;
}

export function BreakTransitionCard({
  isVisible,
  mode,
  breakTimeSeconds,
  completedSessions,
  onStartBreak,
  onSkipBreak,
}: BreakTransitionCardProps) {
  if (!isVisible) return null;

  const isLongBreak = mode === 'longBreak';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <Card className={cn(
            "w-full max-w-md overflow-hidden border-0 shadow-2xl",
            isLongBreak 
              ? "bg-gradient-to-br from-success via-success/95 to-success/90" 
              : "bg-gradient-to-br from-accent via-accent/95 to-accent/90"
          )}>
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>

            <CardContent className="relative p-6 sm:p-8 text-center text-white space-y-6">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                className="flex justify-center"
              >
                <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                  <Coffee className="h-10 w-10 sm:h-12 sm:w-12" />
                </div>
              </motion.div>

              {/* Title */}
              <div className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Badge className="bg-white/20 text-white border-white/30 mb-2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Ciclo {completedSessions} completo!
                  </Badge>
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl sm:text-3xl font-bold font-display"
                >
                  {isLongBreak ? 'Hora da Pausa Longa!' : 'Hora do Descanso!'}
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-white/80 text-sm sm:text-base"
                >
                  {isLongBreak 
                    ? 'Você completou 4 ciclos! Faça uma pausa mais longa.'
                    : 'Descanse um pouco antes do próximo ciclo de foco.'}
                </motion.p>
              </div>

              {/* Break time display */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="py-4"
              >
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Coffee className="h-5 w-5" />
                  <span className="text-3xl sm:text-4xl font-bold font-mono">
                    {formatSecondsToHMS(breakTimeSeconds)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-white/70 mt-2">
                  Tempo de pausa recomendado
                </p>
              </motion.div>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Button
                  onClick={onStartBreak}
                  className="flex-1 h-12 text-base font-semibold bg-white text-primary hover:bg-white/90 shadow-lg"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Iniciar Pausa
                </Button>
                <Button
                  onClick={onSkipBreak}
                  variant="ghost"
                  className="flex-1 h-12 text-base font-semibold text-white hover:bg-white/20 border border-white/30"
                >
                  <SkipForward className="h-5 w-5 mr-2" />
                  Pular Pausa
                </Button>
              </motion.div>

              {/* Tip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-start gap-2 p-3 rounded-lg bg-white/10 text-left"
              >
                <Brain className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-xs text-white/80">
                  <strong>Dica:</strong> Pausas regulares melhoram a retenção e previnem fadiga mental.
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
