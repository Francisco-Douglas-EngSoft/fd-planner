import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBackgroundProps {
  variant?: 'particles' | 'waves' | 'orbs';
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export function AnimatedBackground({ 
  variant = 'orbs', 
  className,
  intensity = 'medium'
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particles animation
  useEffect(() => {
    if (variant !== 'particles') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particleCount = intensity === 'low' ? 30 : intensity === 'medium' ? 50 : 80;
    
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(200, 80%, 60%, ${particle.opacity})`;
        ctx.fill();
      });

      // Draw connections between nearby particles
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const distance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(200, 80%, 60%, ${0.1 * (1 - distance / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [variant, intensity]);

  // Waves animation
  useEffect(() => {
    if (variant !== 'waves') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationId: number;
    let time = 0;

    const waveCount = intensity === 'low' ? 2 : intensity === 'medium' ? 3 : 5;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      for (let wave = 0; wave < waveCount; wave++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);

        for (let x = 0; x <= canvas.width; x += 5) {
          const y = canvas.height - 100 - wave * 40 +
            Math.sin(x * 0.005 + time + wave * 0.5) * 30 +
            Math.sin(x * 0.01 + time * 1.5 + wave) * 15;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, canvas.height - 200, 0, canvas.height);
        gradient.addColorStop(0, `hsla(200, 80%, 55%, ${0.03 + wave * 0.01})`);
        gradient.addColorStop(1, `hsla(185, 70%, 50%, ${0.01 + wave * 0.005})`);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [variant, intensity]);

  if (variant === 'orbs') {
    const orbCount = intensity === 'low' ? 2 : intensity === 'medium' ? 3 : 5;
    return (
      <div className={cn("fixed inset-0 overflow-hidden pointer-events-none -z-10", className)}>
        {Array.from({ length: orbCount }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-3xl animate-float"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              background: `radial-gradient(circle, hsla(${195 + i * 15}, ${75 - i * 5}%, ${55 + i * 5}%, ${0.08 - i * 0.01}) 0%, transparent 70%)`,
              left: `${10 + i * 25}%`,
              top: `${15 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${6 + i * 2}s`,
            }}
          />
        ))}
        {/* Additional subtle gradient orbs */}
        <div 
          className="absolute w-96 h-96 rounded-full blur-3xl animate-pulse-soft"
          style={{
            background: 'radial-gradient(circle, hsla(200, 80%, 60%, 0.05) 0%, transparent 70%)',
            right: '10%',
            bottom: '20%',
            animationDuration: '4s',
          }}
        />
        <div 
          className="absolute w-80 h-80 rounded-full blur-3xl animate-float"
          style={{
            background: 'radial-gradient(circle, hsla(180, 70%, 50%, 0.04) 0%, transparent 70%)',
            left: '5%',
            bottom: '10%',
            animationDelay: '1s',
            animationDuration: '8s',
          }}
        />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn("fixed inset-0 pointer-events-none -z-10", className)}
    />
  );
}
