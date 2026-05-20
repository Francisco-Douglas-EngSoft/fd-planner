import { useState, useEffect } from 'react';
import fdPlannerLogo from '@/assets/fd-planner-logo.png';

interface AnimatedLogoProps {
  className?: string;
}

const AnimatedLogo = ({ className }: AnimatedLogoProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [showRings, setShowRings] = useState(false);

  useEffect(() => {
    // Staggered animations for dramatic reveal
    const glowTimer = setTimeout(() => setShowGlow(true), 200);
    const loadTimer = setTimeout(() => setIsLoaded(true), 400);
    const ringsTimer = setTimeout(() => setShowRings(true), 800);
    
    return () => {
      clearTimeout(glowTimer);
      clearTimeout(loadTimer);
      clearTimeout(ringsTimer);
    };
  }, []);

  return (
    <div className={`flex flex-col items-center gap-6 ${className}`}>
      {/* Logo container with animations */}
      <div className="relative">
        {/* Outer glow effect - appears first */}
        <div 
          className={`absolute inset-0 blur-3xl rounded-full transition-all duration-1000 ease-out ${
            showGlow ? 'opacity-40 scale-150' : 'opacity-0 scale-100'
          }`}
          style={{
            background: 'radial-gradient(circle, hsl(200 70% 55%) 0%, hsl(220 60% 50%) 50%, transparent 70%)',
          }}
        />
        
        {/* Rotating rings - appear after logo */}
        <div 
          className={`absolute -inset-6 border-2 border-primary/30 rounded-full transition-all duration-700 ${
            showRings ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            animation: showRings ? 'spin 10s linear infinite' : 'none'
          }}
        />
        <div 
          className={`absolute -inset-10 border border-primary/15 rounded-full transition-all duration-700 delay-200 ${
            showRings ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            animation: showRings ? 'spin 15s linear infinite reverse' : 'none'
          }}
        />
        
        {/* Pulsing ring */}
        <div 
          className={`absolute -inset-3 rounded-full border-2 border-primary/40 transition-opacity duration-500 ${
            showRings ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            animation: showRings ? 'pulse-ring 2.5s ease-out infinite' : 'none'
          }}
        />
        
        {/* Main logo with smooth fade + scale */}
        <div 
          className={`relative transition-all duration-[1200ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isLoaded 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 -translate-y-6 scale-75'
          }`}
        >
          <img
            src={fdPlannerLogo}
            alt="FD-Planner Logo"
            className="h-32 w-32 sm:h-40 sm:w-40 object-cover rounded-full relative z-10"
            style={{ 
              filter: 'drop-shadow(0 0 30px hsla(200, 70%, 55%, 0.5))',
              animation: isLoaded ? 'float 4s ease-in-out infinite' : 'none'
            }}
          />
          
          {/* Shimmer overlay */}
          <div 
            className={`absolute inset-0 rounded-full overflow-hidden transition-opacity duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
                animation: isLoaded ? 'shimmer 3s ease-in-out infinite' : 'none',
              }}
            />
          </div>
          
          {/* Sparkle effects */}
          <div 
            className={`absolute -top-2 -right-2 w-3 h-3 bg-primary rounded-full transition-opacity duration-500 ${
              showRings ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ animation: showRings ? 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none' }}
          />
          <div 
            className={`absolute -bottom-1 -left-2 w-2 h-2 bg-primary/70 rounded-full transition-opacity duration-500 delay-300 ${
              showRings ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ animation: showRings ? 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s' : 'none' }}
          />
        </div>
      </div>

      {/* Text with staggered animation */}
      <div 
        className={`text-center transition-all duration-1000 ease-out ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
        style={{ transitionDelay: '300ms' }}
      >
        <h1 
          className="text-4xl sm:text-5xl font-display font-bold bg-gradient-to-r from-[hsl(200,70%,55%)] via-[hsl(260,70%,60%)] to-[hsl(200,70%,55%)] bg-clip-text text-transparent bg-[length:200%_auto]"
          style={{
            animation: isLoaded ? 'gradient-shift 4s ease-in-out infinite' : 'none'
          }}
        >
          FD-Planner
        </h1>
        <p 
          className={`text-base sm:text-lg text-muted-foreground mt-2 tracking-widest uppercase font-medium transition-all duration-700 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '600ms' }}
        >
          FD-Planner
        </p>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(150%); }
        }
        
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;