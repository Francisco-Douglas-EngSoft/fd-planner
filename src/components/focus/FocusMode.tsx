import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Coffee, Brain, Volume2, VolumeX, Maximize2, Minimize2, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FocusImpulseButton } from '@/components/antivicio/FocusImpulseButton';

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
  courseName: string;
  courseId: string;
  initialWorkMinutes?: number;
  initialBreakMinutes?: number;
}

export function FocusMode({
  isOpen,
  onClose,
  courseName,
  courseId,
  initialWorkMinutes = 25,
  initialBreakMinutes = 5,
}: FocusModeProps) {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(initialWorkMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  const targetEndTimeRef = useRef<number | null>(null);

  const totalTime = mode === 'work' ? initialWorkMinutes * 60 : initialBreakMinutes * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setMode('work');
      setTimeLeft(initialWorkMinutes * 60);
      setIsRunning(false);
      setSessions(0);
      targetEndTimeRef.current = null;
    }
  }, [isOpen, initialWorkMinutes]);

  // Timer logic
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      if (intervalRef.current) {
        cancelAnimationFrame(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    let lastUpdate = Date.now();

    const tick = () => {
      if (!targetEndTimeRef.current) return;
      
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((targetEndTimeRef.current - now) / 1000));
      
      if (now - lastUpdate >= 1000 || remaining <= 0) {
        lastUpdate = now;
        setTimeLeft(remaining);
      }
      
      if (remaining > 0) {
        intervalRef.current = requestAnimationFrame(tick);
      }
    };

    intervalRef.current = requestAnimationFrame(tick);

    return () => {
      if (intervalRef.current) {
        cancelAnimationFrame(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  // Handle timer completion
  const handleTimerComplete = useCallback(async () => {
    setIsRunning(false);
    targetEndTimeRef.current = null;

    // Play notification sound
    if (!isMuted) {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVIzpdfhsGkdD22p4txuQC5xt+jXaC8bdbnk1lgfLqLY3po+EIi92dBXHD6k0thzKiCo0tdsJiuq1tljKy2q1tdqLSuo1dlsKyer1NlrJyiq09hnJSmr09loKCis1NhqKSmr1NlpKCms1NhqKSmr1NloKCms1NhqKSms1NlpKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NhoKSms1NhqKSmr1NhoKSms1NhqKSmr1NhoKSms1NhqKSmr1NhoKSms1NhqKSmr1NhoKSms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NlpKCms1NlqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms');
        audio.play().catch(() => {});
      } catch {
        // Ignore audio play errors (e.g. user interrupted)
      }
    }

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('FD-Planner - Modo Foco', {
        body: mode === 'work' ? '🎉 Sessão concluída! Hora da pausa.' : '💪 Pausa terminada! Vamos voltar ao foco.',
        icon: '/favicon.png',
      });
    }

    if (mode === 'work') {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      
      // Save focus session
      if (user && courseId) {
        try {
          await supabase.from('focus_sessions').insert({
            user_id: user.id,
            course_id: courseId,
            duration_minutes: initialWorkMinutes,
            session_type: 'work',
          });
        } catch (error) {
          console.error('Failed to save focus session:', error);
        }
      }
      
      setMode('break');
      setTimeLeft(initialBreakMinutes * 60);
    } else {
      setMode('work');
      setTimeLeft(initialWorkMinutes * 60);
    }
  }, [mode, sessions, isMuted, user, courseId, initialWorkMinutes, initialBreakMinutes]);

  // Watch for timer completion
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }
  }, [timeLeft, isRunning, handleTimerComplete]);

  const toggleTimer = useCallback(() => {
    if (!isRunning) {
      targetEndTimeRef.current = Date.now() + timeLeft * 1000;
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } else {
      targetEndTimeRef.current = null;
    }
    setIsRunning(prev => !prev);
  }, [isRunning, timeLeft]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setMode('work');
    setTimeLeft(initialWorkMinutes * 60);
  }, [initialWorkMinutes]);

  const addTime = useCallback((minutes: number) => {
    const newTime = timeLeft + minutes * 60;
    setTimeLeft(newTime);
    if (isRunning && targetEndTimeRef.current) {
      targetEndTimeRef.current += minutes * 60 * 1000;
    }
  }, [timeLeft, isRunning]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.error('Fullscreen error:', e);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center transition-colors duration-700",
        mode === 'work' 
          ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" 
          : "bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900"
      )}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse",
          mode === 'work' ? "bg-blue-500" : "bg-emerald-500"
        )} />
        <div className={cn(
          "absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse",
          mode === 'work' ? "bg-indigo-500" : "bg-teal-500"
        )} style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="text-white/70">
            <p className="text-sm">Estudando</p>
            <p className="font-medium text-white">{courseName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Impulse button during focus */}
          {isRunning && mode === 'work' && (
            <FocusImpulseButton variant="icon" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center space-y-8">
        {/* Mode indicator */}
        <div className="flex items-center justify-center gap-3 text-white/80">
          {mode === 'work' ? (
            <Brain className="h-8 w-8" />
          ) : (
            <Coffee className="h-8 w-8" />
          )}
          <span className="text-2xl font-medium">
            {mode === 'work' ? 'Foco Total' : 'Pausa Relaxante'}
          </span>
        </div>

        {/* Timer circle */}
        <div className="relative">
          <svg className="w-80 h-80 transform -rotate-90">
            <circle
              cx="160"
              cy="160"
              r="150"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="160"
              cy="160"
              r="150"
              stroke="url(#timerGradient)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 150}
              strokeDashoffset={2 * Math.PI * 150 * (1 - progress / 100)}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={mode === 'work' ? '#3B82F6' : '#10B981'} />
                <stop offset="100%" stopColor={mode === 'work' ? '#8B5CF6' : '#14B8A6'} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl font-bold text-white tabular-nums tracking-tight">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={resetTimer}
            className="w-14 h-14 rounded-full text-white/70 hover:text-white hover:bg-white/10"
          >
            <RotateCcw className="h-6 w-6" />
          </Button>
          
          <Button
            onClick={toggleTimer}
            className={cn(
              "w-24 h-24 rounded-full text-xl font-semibold shadow-2xl transition-all duration-300",
              mode === 'work'
                ? "bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500"
                : "bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500",
              isRunning && "animate-pulse"
            )}
          >
            {isRunning ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10 ml-1" />}
          </Button>
          
          <div className="flex flex-col gap-2">
            {[5, 10].map(mins => (
              <Button
                key={mins}
                variant="ghost"
                size="sm"
                onClick={() => addTime(mins)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Plus className="h-3 w-3 mr-1" />
                {mins}min
              </Button>
            ))}
          </div>
        </div>

        {/* Session counter */}
        <div className="flex items-center justify-center gap-2 text-white/60">
          <span className="text-sm">Sessões concluídas:</span>
          <span className="text-lg font-bold text-white">{sessions}</span>
        </div>
      </div>

      {/* Keyboard shortcut hints */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-white/40 text-sm">
        <span>ESC para sair</span>
        <span>•</span>
        <span>F11 para tela cheia</span>
      </div>
    </div>
  );
}
