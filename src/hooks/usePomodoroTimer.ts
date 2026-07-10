import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { emitFocusSessionSaved } from '@/hooks/useRealtimeFocusSessions';
import { enqueueFocusSession, flushFocusQueue } from '@/lib/offlineFocusQueue';

/**
 * Persists a focus session offline-first: the session is written to a
 * localStorage queue (always succeeds), then we try to flush to Supabase.
 * If offline / network error / tab closes, the queue is replayed on next
 * load or when connectivity returns.
 */
async function persistFocusSession(params: {
  userId: string;
  courseId: string;
  moduleId?: string | null;
  durationMinutes: number;
  sessionType: 'work' | 'break' | 'longBreak';
}) {
  enqueueFocusSession({
    user_id: params.userId,
    course_id: params.courseId,
    module_id: params.moduleId ?? null,
    duration_minutes: params.durationMinutes,
    session_type: params.sessionType,
    completed_at: new Date().toISOString(),
  });
  // Notify listeners immediately so UI updates optimistically.
  try { emitFocusSessionSaved(); } catch { /* noop */ }
  // Fire-and-forget flush; failures stay in the queue for later retry.
  void flushFocusQueue();
}

const STORAGE_KEY = 'fdplanner_pomodoro_state';
const PRESETS_KEY = 'fdplanner_pomodoro_presets';
const SETTINGS_KEY = 'fdplanner_pomodoro_settings';

interface PomodoroSettings {
  autoStartBreak: boolean;
  cyclesUntilLongBreak: number;
}

interface PomodoroState {
  mode: 'work' | 'break' | 'longBreak';
  sessions: number;
  presetIndex: number;
  selectedCourse: string;
  selectedModule: string;
  // New approach: store the target end time when running
  targetEndTime: number | null;
  // Store the remaining time when paused
  remainingTime: number;
  customTotalTime: number | null;
  // Store when the timer was actually started (to calculate elapsed time accurately)
  timerStartedAt: number | null;
}

export interface Preset {
  name: string;
  work: number;
  break: number;
  longBreak: number;
}

const defaultPresets: Preset[] = [];

export function usePomodoroTimer() {
  const [presets, setPresets] = useState<Preset[]>(() => {
    const saved = localStorage.getItem(PRESETS_KEY);
    return saved ? JSON.parse(saved) : defaultPresets;
  });
  const [presetIndex, setPresetIndex] = useState(0);
  const [mode, setMode] = useState<'work' | 'break' | 'longBreak'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [customTotalTime, setCustomTotalTime] = useState<number | null>(null);
  const [pendingBreak, setPendingBreak] = useState<null | { mode: 'break' | 'longBreak'; seconds: number }>(null);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  // Absolute timestamp (ms) when the running segment will finish. Mirrored in a
  // ref so the tick loop always reads a fresh value without re-subscribing.
  const [endTime, setEndTime] = useState<number | null>(null);

  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<PomodoroSettings>;
        return {
          autoStartBreak: Boolean(parsed.autoStartBreak),
          cyclesUntilLongBreak:
            typeof parsed.cyclesUntilLongBreak === 'number' && parsed.cyclesUntilLongBreak >= 2
              ? Math.floor(parsed.cyclesUntilLongBreak)
              : 4,
        };
      } catch {
        // ignore
      }
    }
    return { autoStartBreak: false, cyclesUntilLongBreak: 4 };
  });
  
  const targetEndTimeRef = useRef<number | null>(null);

  // Keep the display end-time state in sync with the ref. Piggybacks on the
  // per-second timeLeft updates so the UI can show the projected end hour.
  useEffect(() => {
    setEndTime(isRunning ? targetEndTimeRef.current : null);
  }, [isRunning, timeLeft]);

  const preset = presets[presetIndex] || { name: 'Padrão', work: 25, break: 5, longBreak: 15 };

  // Save presets to localStorage
  useEffect(() => {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  }, [presets]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const state: PomodoroState = JSON.parse(savedState);
        setPresetIndex(state.presetIndex || 0);
        setMode(state.mode);
        setSessions(state.sessions);
        setSelectedCourse(state.selectedCourse || '');
        setSelectedModule(state.selectedModule || '');
        setCustomTotalTime(state.customTotalTime || null);
        setTimerStartedAt(state.timerStartedAt || null);

        if (state.targetEndTime) {
          // Timer was running - calculate remaining time
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((state.targetEndTime - now) / 1000));
          
          if (remaining > 0) {
            setTimeLeft(remaining);
            setIsRunning(true);
            targetEndTimeRef.current = state.targetEndTime;
          } else {
            // Timer completed while user was away (tab closed, sleep, offline).
            // CORREÇÃO: Calcular o tempo REALMENTE decorrido usando timerStartedAt
            setTimeLeft(0);
            setIsRunning(false);
            targetEndTimeRef.current = null;

            if (state.mode === 'work' && state.selectedCourse && state.timerStartedAt) {
              const totalTimeSeconds = state.customTotalTime || 25 * 60;
              
              // Calcular quanto tempo realmente passou desde que o timer foi iniciado
              const actualElapsedMs = state.targetEndTime - state.timerStartedAt;
              const actualElapsedSeconds = Math.floor(actualElapsedMs / 1000);
              
              // Limitar ao tempo total configurado (não pode ser maior)
              const elapsedSeconds = Math.min(actualElapsedSeconds, totalTimeSeconds);
              const durationMinutes = Math.round(elapsedSeconds / 60);
              
              if (durationMinutes >= 1) {
                supabase.auth.getUser().then(({ data: { user } }) => {
                  if (user) {
                    void persistFocusSession({
                      userId: user.id,
                      courseId: state.selectedCourse,
                      moduleId: state.selectedModule || null,
                      durationMinutes,
                      sessionType: 'work',
                    });
                  }
                }).catch(() => { /* enqueued on next try */ });
              }
            }
            
            // Limpar timerStartedAt após processar
            setTimerStartedAt(null);
          }
        } else {
          // Timer was paused - restore remaining time
          setTimeLeft(state.remainingTime || 25 * 60);
          setIsRunning(false);
          targetEndTimeRef.current = null;
        }
      } catch (error) {
        console.error('Failed to load timer state:', error);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    
    const state: PomodoroState = {
      mode,
      sessions,
      presetIndex,
      selectedCourse,
      selectedModule,
      targetEndTime: isRunning ? targetEndTimeRef.current : null,
      remainingTime: timeLeft,
      customTotalTime,
      timerStartedAt: isRunning ? timerStartedAt : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [mode, timeLeft, isRunning, sessions, presetIndex, selectedCourse, selectedModule, isInitialized, customTotalTime, timerStartedAt]);

  // Handle timer completion
  const handleTimerComplete = useCallback(async () => {
    setIsRunning(false);
    targetEndTimeRef.current = null;

    // Play notification sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVIzpdfhsGkdD22p4txuQC5xt+jXaC8bdbnk1lgfLqLY3po+EIi92dBXHD6k0thzKiCo0tdsJiuq1tljKy2q1tdqLSuo1dlsKyer1NlrJyiq09hnJSmr09loKCis1NhqKSmr1NlpKCms1NhqKSmr1NloKCms1NhqKSms1NlpKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NhoKSms1NhqKSmr1NhoKSms1NhqKSmr1NhoKSms1NhqKSmr1NhoKSms1NhqKSmr1NhoKSms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NlpKCms1NlqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms');
      audio.play().catch(() => {});
    } catch (e) {
      // Ignore audio errors
    }

    // Show notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('FD-Planner Timer', {
        body: mode === 'work' ? 'Hora da pausa!' : 'Hora de voltar ao foco!',
        icon: '/favicon.ico',
      });
    }

    if (mode === 'work') {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      
      // Save focus session to database if course is selected
      if (selectedCourse) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Calculate the actual duration that was completed
            // customTotalTime stores the initial time in seconds when the timer was set
            const totalTimeSeconds = customTotalTime || preset.work * 60;
            const durationMinutes = Math.round(totalTimeSeconds / 60);

            // Only save if duration is at least 1 minute
            if (durationMinutes >= 1) {
              await persistFocusSession({
                userId: user.id,
                courseId: selectedCourse,
                moduleId: selectedModule || null,
                durationMinutes,
                sessionType: 'work',
              });
            }
          }
        } catch (error) {
          console.error('Failed to save focus session:', error);
        }
      }
      
      setCustomTotalTime(null);

      const cyclesUntilLongBreak = Math.max(2, Math.floor(settings.cyclesUntilLongBreak || 4));
      const nextMode: 'break' | 'longBreak' =
        newSessions % cyclesUntilLongBreak === 0 ? 'longBreak' : 'break';
      const nextSeconds = (nextMode === 'longBreak' ? preset.longBreak : preset.break) * 60;

      // Limpar timerStartedAt após completar uma sessão de trabalho
      setTimerStartedAt(null);

      if (settings.autoStartBreak) {
        // Auto-start break immediately.
        const now = Date.now();
        setMode(nextMode);
        setTimeLeft(nextSeconds);
        setCustomTotalTime(nextSeconds);
        targetEndTimeRef.current = now + nextSeconds * 1000;
        setTimerStartedAt(now);
        setIsRunning(true);
      } else {
        // Manual break: stage a pending break so UI can ask start/skip.
        setPendingBreak({ mode: nextMode, seconds: nextSeconds });
        setTimeLeft(0);
      }
    } else {
      // Completou um break - voltar para work
      setMode('work');
      setTimeLeft(preset.work * 60);
      setCustomTotalTime(null);
      setTimerStartedAt(null);
    }
  }, [mode, sessions, preset, selectedCourse, customTotalTime, settings]);

  // Timer logic — timestamp based so it stays accurate even when the tab is
  // backgrounded, the page is closed, or the user navigates away. Instead of
  // relying on requestAnimationFrame (which is throttled/paused off-screen and
  // caused the "freeze" bug), we recompute the remaining time from the absolute
  // targetEndTime on every tick and whenever the tab becomes visible again.
  useEffect(() => {
    if (!isRunning) return;

    const sync = () => {
      if (!targetEndTimeRef.current) return;
      const remaining = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    // Immediate sync (covers remount / return-to-tab / resume from sleep).
    sync();

    const intervalId = window.setInterval(sync, 500);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', sync);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', sync);
    };
  }, [isRunning]);

  // Watch for timer completion
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }
  }, [timeLeft, isRunning, handleTimerComplete]);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      // Pausing - capture remaining time from the ref before clearing it
      if (targetEndTimeRef.current) {
        const remaining = Math.max(0, Math.floor((targetEndTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
      targetEndTimeRef.current = null;
      setIsRunning(false);
      // Manter timerStartedAt ao pausar para poder retomar corretamente
    } else {
      // Starting the timer - set target end time
      const now = Date.now();
      targetEndTimeRef.current = now + timeLeft * 1000;
      
      // Se não temos timerStartedAt, significa que é um novo início (não uma retomada)
      if (!timerStartedAt) {
        setTimerStartedAt(now);
      }
      
      setIsRunning(true);

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [isRunning, timeLeft, timerStartedAt]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setTimerStartedAt(null);
    setMode('work');
    setTimeLeft(preset.work * 60);
    setCustomTotalTime(null);
  }, [preset]);

  // Stop timer and save session with elapsed time
  const stopAndSave = useCallback(async () => {
    if (!isRunning && timeLeft === (customTotalTime || preset.work * 60)) {
      // Timer hasn't started, nothing to save
      setTimerStartedAt(null);
      return;
    }

    setIsRunning(false);
    targetEndTimeRef.current = null;

    // Calculate elapsed time usando timerStartedAt se disponível
    let elapsedMinutes = 0;
    
    if (timerStartedAt) {
      // Calcular tempo decorrido desde o início real
      const now = Date.now();
      const elapsedMs = now - timerStartedAt;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      
      // Limitar ao tempo total configurado
      const totalTimeSeconds = customTotalTime || preset.work * 60;
      const cappedElapsedSeconds = Math.min(elapsedSeconds, totalTimeSeconds);
      elapsedMinutes = Math.round(cappedElapsedSeconds / 60);
    } else {
      // Fallback: usar o método antigo
      const totalTimeSeconds = customTotalTime || preset.work * 60;
      const elapsedSeconds = totalTimeSeconds - timeLeft;
      elapsedMinutes = Math.round(elapsedSeconds / 60);
    }

    // Save focus session if there's meaningful progress (at least 1 minute)
    if (elapsedMinutes >= 1 && selectedCourse && mode === 'work') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await persistFocusSession({
            userId: user.id,
            courseId: selectedCourse,
            moduleId: selectedModule || null,
            durationMinutes: elapsedMinutes,
            sessionType: 'work',
          });
        }
      } catch (error) {
        console.error('Failed to save focus session:', error);
      }
    }

    // Reset timer
    setMode('work');
    setTimeLeft(preset.work * 60);
    setCustomTotalTime(null);
    setTimerStartedAt(null);

    return elapsedMinutes;
  }, [isRunning, timeLeft, customTotalTime, preset, selectedCourse, mode, timerStartedAt, selectedModule]);

  const addTime = useCallback((minutes: number) => {
    const addedSeconds = minutes * 60;
    setTimeLeft(prev => prev + addedSeconds);
    
    // Also update customTotalTime so the added time is counted when saving
    setCustomTotalTime(prev => (prev || timeLeft) + addedSeconds);
    
    if (isRunning && targetEndTimeRef.current) {
      targetEndTimeRef.current += addedSeconds * 1000;
    }
  }, [timeLeft, isRunning]);

  // Set custom time in seconds (for cycle-based timer)
  const setCustomTime = useCallback((seconds: number, customMode: 'work' | 'break' = 'work') => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setTimerStartedAt(null);
    setMode(customMode);
    setTimeLeft(seconds);
    setCustomTotalTime(seconds);
  }, []);

  const changePreset = useCallback((newPreset: Preset) => {
    const index = presets.findIndex(p => p.name === newPreset.name);
    if (index !== -1) {
      setPresetIndex(index);
    }
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setTimerStartedAt(null);
    setMode('work');
    setTimeLeft(newPreset.work * 60);
    setCustomTotalTime(null);
  }, [presets]);

  const changeMode = useCallback((newMode: 'work' | 'break' | 'longBreak') => {
    setPendingBreak(null);
    setMode(newMode);
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setTimerStartedAt(null);
    const time = newMode === 'work' 
      ? preset.work 
      : newMode === 'break' 
        ? preset.break 
        : preset.longBreak;
    setTimeLeft(time * 60);
    setCustomTotalTime(null);
  }, [preset]);

  const startPendingBreak = useCallback(() => {
    if (!pendingBreak) return;
    setMode(pendingBreak.mode);
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setTimerStartedAt(null);
    setTimeLeft(pendingBreak.seconds);
    setCustomTotalTime(pendingBreak.seconds);
    setPendingBreak(null);
  }, [pendingBreak]);

  const startPendingBreakAndRun = useCallback(() => {
    if (!pendingBreak) return;

    // Atomic start: ensure the timer starts with the pending break duration,
    // without relying on a subsequent toggleTimer call (which could capture stale timeLeft).
    const seconds = pendingBreak.seconds;
    const now = Date.now();
    
    setMode(pendingBreak.mode);
    setTimeLeft(seconds);
    setCustomTotalTime(seconds);
    setPendingBreak(null);

    targetEndTimeRef.current = now + seconds * 1000;
    setTimerStartedAt(now);
    setIsRunning(true);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [pendingBreak]);

  const skipPendingBreak = useCallback(() => {
    if (!pendingBreak) return;
    setPendingBreak(null);
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setTimerStartedAt(null);
    setMode('work');
    setTimeLeft(preset.work * 60);
    setCustomTotalTime(null);
  }, [pendingBreak, preset.work]);

  const updatePreset = useCallback((index: number, newPreset: Preset) => {
    setPresets(prev => {
      const updated = [...prev];
      updated[index] = newPreset;
      return updated;
    });
    
    // If updating current preset, also update timeLeft
    if (index === presetIndex && !isRunning) {
      const time = mode === 'work' 
        ? newPreset.work 
        : mode === 'break' 
          ? newPreset.break 
          : newPreset.longBreak;
      setTimeLeft(time * 60);
    }
  }, [presetIndex, isRunning, mode]);

  const addCustomPreset = useCallback((newPreset: Preset) => {
    setPresets(prev => [...prev, newPreset]);
  }, []);

  const removePreset = useCallback((index: number) => {
    if (presets.length <= 1) return;
    
    setPresets(prev => prev.filter((_, i) => i !== index));
    if (presetIndex >= index && presetIndex > 0) {
      setPresetIndex(prev => prev - 1);
    }
  }, [presets.length, presetIndex]);

  const totalTime = customTotalTime || (mode === 'work' 
    ? preset.work * 60 
    : mode === 'break' 
      ? preset.break * 60 
      : preset.longBreak * 60);

  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // Reset timer when course changes (only if not running)
  const handleCourseChange = useCallback((courseId: string) => {
    if (courseId !== selectedCourse) {
      setPendingBreak(null);
      setSelectedCourse(courseId);
      // Trocar de curso invalida o módulo selecionado
      setSelectedModule('');
      // Reset timer state when changing course (if not running)
      if (!isRunning) {
        setTimeLeft(preset.work * 60);
        setCustomTotalTime(null);
        setMode('work');
        targetEndTimeRef.current = null;
        setTimerStartedAt(null);
      }
    }
  }, [selectedCourse, isRunning, preset.work]);

  // Calculate current elapsed time in minutes (for real-time display)
  const currentElapsedMinutes = useMemo(() => {
    if (!isRunning && !customTotalTime) return 0;
    const totalSeconds = customTotalTime || preset.work * 60;
    const elapsedSeconds = totalSeconds - timeLeft;
    return Math.max(0, Math.floor(elapsedSeconds / 60));
  }, [isRunning, customTotalTime, preset.work, timeLeft]);

  return {
    mode,
    timeLeft,
    isRunning,
    sessions,
    preset,
    progress,
    selectedCourse,
    setSelectedCourse: handleCourseChange,
    selectedModule,
    setSelectedModule,
    pendingBreak,
    startPendingBreak,
    startPendingBreakAndRun,
    skipPendingBreak,
    settings,
    setSettings,
    toggleTimer,
    resetTimer,
    stopAndSave,
    addTime,
    setCustomTime,
    changePreset,
    changeMode,
    presets,
    updatePreset,
    addCustomPreset,
    removePreset,
    presetIndex,
    customTotalTime,
    currentElapsedMinutes,
    // Wall-clock timestamps for the running session (ms since epoch).
    sessionStartTime: timerStartedAt,
    sessionEndTime: endTime,
  };
}
