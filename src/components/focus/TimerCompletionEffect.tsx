import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TimerCompletionEffectProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function TimerCompletionEffect({ trigger, onComplete }: TimerCompletionEffectProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    delay: number;
  }>>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      // Generate confetti particles
      const colors = [
        'bg-primary',
        'bg-accent',
        'bg-success',
        'bg-yellow-500',
        'bg-pink-500',
        'bg-blue-500',
      ];

      const newParticles = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        delay: Math.random() * 0.5,
      }));

      setParticles(newParticles);
      setIsActive(true);

      // Clean up after animation
      const timeout = setTimeout(() => {
        setIsActive(false);
        setParticles([]);
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [trigger, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={cn(
            "absolute rounded-full",
            particle.color
          )}
          style={{
            left: `${particle.x}%`,
            top: '-20px',
            width: particle.size,
            height: particle.size,
            animation: `confetti-fall 2s ease-out ${particle.delay}s forwards`,
          }}
        />
      ))}

      {/* Central flash effect */}
      <div 
        className="absolute inset-0 bg-primary/20 animate-ping"
        style={{ animationDuration: '0.5s', animationIterationCount: 1 }}
      />

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
