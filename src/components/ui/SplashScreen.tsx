import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import fdPlannerLogo from '@/assets/fd-planner-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

// Teal color palette
const TEAL_COLORS = {
  primary: '#1D7373',
  secondary: '#107361',
  dark: '#042326',
  light: '#2D9E9E',
  glow: '#40BFBF',
};

export function SplashScreen({ onComplete, minDuration = 2800 }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  // Generate particles with memo to prevent re-renders
  const particles = useMemo(() => 
    [...Array(30)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.5,
    })), []
  );

  useEffect(() => {
    // Staggered animations for dramatic reveal
    const logoTimer = setTimeout(() => setShowLogo(true), 200);
    const contentTimer = setTimeout(() => setShowContent(true), 100);
    const textTimer = setTimeout(() => setShowText(true), 600);
    const taglineTimer = setTimeout(() => setShowTagline(true), 900);
    const loaderTimer = setTimeout(() => setShowLoader(true), 1200);
    
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 700);
    }, minDuration);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(contentTimer);
      clearTimeout(textTimer);
      clearTimeout(taglineTimer);
      clearTimeout(loaderTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete, minDuration]);

  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden",
      "transition-all duration-700 ease-out",
      isExiting && "opacity-0 scale-105"
    )}
    style={{
      background: `linear-gradient(135deg, ${TEAL_COLORS.dark} 0%, ${TEAL_COLORS.secondary} 50%, ${TEAL_COLORS.dark} 100%)`,
    }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Central glow orb - Teal */}
        <div 
          className={cn(
            "absolute w-[800px] h-[800px] rounded-full opacity-0 blur-[100px]",
            "transition-all duration-1500 ease-out",
            showContent && "opacity-60"
          )}
          style={{
            background: `radial-gradient(circle, ${TEAL_COLORS.glow} 0%, ${TEAL_COLORS.primary} 40%, transparent 70%)`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
        
        {/* Secondary glow orbs - Teal themed */}
        <div 
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: `radial-gradient(circle, ${TEAL_COLORS.light}40 0%, transparent 70%)`,
            top: '-10%',
            right: '-10%',
            animation: 'float-slow 12s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute w-[350px] h-[350px] rounded-full"
          style={{
            background: `radial-gradient(circle, ${TEAL_COLORS.primary}30 0%, transparent 70%)`,
            bottom: '-15%',
            left: '-5%',
            animation: 'float-slow 15s ease-in-out infinite reverse'
          }}
        />
        
        {/* Animated mesh gradient */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(at 20% 30%, ${TEAL_COLORS.glow}40 0%, transparent 50%),
              radial-gradient(at 80% 70%, ${TEAL_COLORS.light}30 0%, transparent 50%),
              radial-gradient(at 50% 50%, ${TEAL_COLORS.primary}20 0%, transparent 60%)
            `,
            animation: 'mesh-shift 8s ease-in-out infinite'
          }}
        />
        
        {/* Animated grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="splash-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke={TEAL_COLORS.glow} strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#splash-grid)" />
        </svg>
        
        {/* Floating teal particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: `radial-gradient(circle, ${TEAL_COLORS.glow} 0%, ${TEAL_COLORS.primary} 100%)`,
              boxShadow: `0 0 ${particle.size * 2}px ${TEAL_COLORS.glow}`,
              animation: `particle-float ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
              opacity: particle.opacity
            }}
          />
        ))}
        
        {/* Rising particles effect */}
        {[...Array(15)].map((_, i) => (
          <div
            key={`rising-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${5 + i * 6.5}%`,
              bottom: '-5%',
              width: '3px',
              height: '3px',
              background: TEAL_COLORS.glow,
              boxShadow: `0 0 8px ${TEAL_COLORS.glow}`,
              animation: `particle-rise ${4 + (i % 3)}s linear infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
      
      {/* Main content */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo with dramatic entrance */}
        <div className={cn(
          "relative transition-all duration-1000 ease-out",
          showLogo 
            ? "opacity-100 translate-y-0 scale-100" 
            : "opacity-0 translate-y-16 scale-50"
        )}>
          {/* Multi-layer glow effect */}
          <div 
            className={cn(
              "absolute inset-0 rounded-full blur-[60px] scale-[2] transition-opacity duration-1500",
              showLogo ? "opacity-70" : "opacity-0"
            )}
            style={{ 
              background: `radial-gradient(circle, ${TEAL_COLORS.glow} 0%, ${TEAL_COLORS.primary} 50%, transparent 80%)`,
            }}
          />
          
          {/* Outer glow ring */}
          <div 
            className={cn(
              "absolute inset-0 rounded-full blur-3xl scale-150 transition-opacity duration-1000",
              showLogo ? "opacity-50" : "opacity-0"
            )}
            style={{ 
              background: `linear-gradient(135deg, ${TEAL_COLORS.glow}, ${TEAL_COLORS.light})`,
            }}
          />
          
          {/* Animated rotating rings */}
          <div 
            className="absolute -inset-8 rounded-full border border-[#40BFBF40]"
            style={{
              animation: 'spin 8s linear infinite'
            }}
          />
          <div 
            className="absolute -inset-12 rounded-full border border-[#1D737330]"
            style={{
              animation: 'spin 12s linear infinite reverse'
            }}
          />
          <div 
            className="absolute -inset-16 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent, #40BFBF40, transparent)',
              animation: 'spin 6s linear infinite',
            }}
          />
          
          {/* Pulsing ring */}
          <div 
            className="absolute -inset-4 rounded-full"
            style={{
              border: `2px solid ${TEAL_COLORS.glow}60`,
              animation: 'pulse-ring-teal 2.5s ease-out infinite'
            }}
          />
          
          {/* Logo container with glassmorphism */}
          <div className={cn(
            "relative w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden",
            "ring-4 ring-[#40BFBF40]",
          )}
          style={{
            boxShadow: `
              0 0 60px ${TEAL_COLORS.glow}80,
              0 0 100px ${TEAL_COLORS.primary}60,
              inset 0 0 30px ${TEAL_COLORS.glow}20
            `
          }}
          >
            <img 
              src={fdPlannerLogo} 
              alt="FD-Planner" 
              className="w-full h-full object-cover rounded-full"
            />
            
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />
            
            {/* Inner glow overlay */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${TEAL_COLORS.glow}20 0%, transparent 50%)`,
              }}
            />
          </div>
          
          {/* Orbiting particles */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: TEAL_COLORS.glow,
                boxShadow: `0 0 10px ${TEAL_COLORS.glow}, 0 0 20px ${TEAL_COLORS.primary}`,
                animation: `orbit ${3 + i}s linear infinite`,
                animationDelay: `${i * 1.5}s`,
                top: '50%',
                left: '50%',
                transformOrigin: `${80 + i * 15}px 0`,
              }}
            />
          ))}
        </div>
        
        {/* Brand name with teal gradient animation */}
        <div className="flex flex-col items-center gap-3">
          <h1 
            className={cn(
              "font-display text-5xl sm:text-6xl font-bold tracking-tight",
              "bg-clip-text text-transparent",
              "bg-[length:200%_auto]",
              "transition-all duration-1000 ease-out",
              showText 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-8"
            )}
            style={{
              backgroundImage: `linear-gradient(135deg, ${TEAL_COLORS.glow}, #fff, ${TEAL_COLORS.light}, ${TEAL_COLORS.glow})`,
              animation: showText ? 'gradient-shift 4s ease-in-out infinite' : 'none',
              textShadow: `0 0 40px ${TEAL_COLORS.glow}60`
            }}
          >
            FD-Planner
          </h1>
          
          <p 
            className={cn(
              "text-lg sm:text-xl font-medium tracking-[0.3em] uppercase",
              "transition-all duration-700 ease-out delay-150",
              showTagline 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            )}
            style={{
              color: TEAL_COLORS.light,
              textShadow: `0 0 20px ${TEAL_COLORS.primary}80`
            }}
          >
            FD-Planner
          </p>
        </div>
        
        {/* Loading indicator */}
        <div 
          className={cn(
            "mt-4 transition-all duration-500 ease-out",
            showLoader 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-4"
          )}
        >
          <TealLoadingDots />
        </div>
      </div>
      
      {/* Bottom branding */}
      <div 
        className={cn(
          "absolute bottom-8 flex flex-col items-center gap-2",
          "transition-all duration-500 delay-500",
          showLoader ? "opacity-100" : "opacity-0"
        )}
      >
        <div 
          className="flex items-center gap-2 text-sm"
          style={{ color: `${TEAL_COLORS.light}90` }}
        >
          <span 
            className="w-2 h-2 rounded-full"
            style={{
              background: TEAL_COLORS.glow,
              boxShadow: `0 0 8px ${TEAL_COLORS.glow}`,
              animation: 'pulse 2s ease-in-out infinite'
            }}
          />
          <span>Preparando seu ambiente de estudos</span>
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(150%); }
        }
        
        @keyframes pulse-ring-teal {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes mesh-shift {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(2deg); }
        }
        
        @keyframes particle-float {
          0%, 100% { 
            transform: translateY(0px) translateX(0px); 
            opacity: 0.3;
          }
          25% { 
            transform: translateY(-20px) translateX(10px); 
            opacity: 0.6;
          }
          50% { 
            transform: translateY(-40px) translateX(-5px); 
            opacity: 0.8;
          }
          75% { 
            transform: translateY(-20px) translateX(-10px); 
            opacity: 0.5;
          }
        }
        
        @keyframes particle-rise {
          0% { 
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.3;
          }
          100% { 
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
          }
        }
        
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(80px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
        }
        
        @keyframes dot-bounce-teal {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function TealLoadingDots() {
  return (
    <div className="flex items-center gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-full"
          style={{
            background: TEAL_COLORS.glow,
            boxShadow: `0 0 12px ${TEAL_COLORS.glow}, 0 0 24px ${TEAL_COLORS.primary}`,
            animation: 'dot-bounce-teal 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.16}s`
          }}
        />
      ))}
    </div>
  );
}
