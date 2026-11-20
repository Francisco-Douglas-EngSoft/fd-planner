import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { emitFocusSessionSaved } from '@/hooks/useRealtimeFocusSessions';
import { enqueueFocusSession, flushFocusQueue } from '@/lib/offlineFocusQueue';
import { checkCycleCompletion } from '@/lib/focusCycleCompletion';

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
  ended: 'timer_finished' | 'stopped_early' | 'finished_while_away';
  plannedMinutes: number;
  presetName: string;
}) {
  enqueueFocusSession({
    user_id: params.userId,
    course_id: params.courseId,
    module_id: params.moduleId ?? null,
    duration_minutes: params.durationMinutes,
    session_type: params.sessionType,
    completed_at: new Date().toISOString(),
  });
  if (params.sessionType === 'work') {
    window.__lovableEvents?.track?.('project.focus_session_completed', {
      duration_minutes: params.durationMinutes,
      planned_minutes: params.plannedMinutes,
      ended: params.ended,
      preset: params.presetName,
      has_module: !!params.moduleId,
    });
  }
  // Notify listeners immediately so UI updates optimistically.
  try { emitFocusSessionSaved(); } catch { /* noop */ }
  // Fire-and-forget flush; failures stay in the queue for later retry.
  void flushFocusQueue();
}

const STORAGE_KEY = 'fdplanner_pomodoro_state';
const PRESETS_KEY = 'fdplanner_pomodoro_presets';
const SETTINGS_KEY = 'fdplanner_pomodoro_settings';
const ACTIVE_PRESET_KEY = 'fdplanner_pomodoro_active_preset';
// Horário de término do último ciclo já concluído (por qualquer aba): evita aviso duplo.
const COMPLETED_KEY = 'fdplanner_pomodoro_completed';

function readStoredState(): PomodoroState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PomodoroState) : undefined;
  } catch {
    return undefined;
  }
}

function readClaimedTarget(): number | null {
  try {
    const v = Number(localStorage.getItem(COMPLETED_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

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
  /** Texto curto explicando para que serve o ritmo (presets prontos). */
  description?: string;
  /** Nome e descrição em inglês (presets prontos). */
  nameEn?: string;
  descriptionEn?: string;
  /** true para os presets prontos do app (não podem ser apagados). */
  builtIn?: boolean;
}

/** Ritmos prontos, sempre disponíveis. Os presets do usuário ficam em `presets`. */
export const BUILT_IN_PRESETS: Preset[] = [
  { name: 'Pomodoro Clássico', nameEn: 'Classic Pomodoro', work: 25, break: 5, longBreak: 15, description: 'Equilíbrio ideal para o dia a dia', descriptionEn: 'The ideal everyday balance', builtIn: true },
  { name: 'Sprint', nameEn: 'Sprint', work: 15, break: 3, longBreak: 10, description: 'Revisões e tarefas rápidas', descriptionEn: 'Reviews and quick tasks', builtIn: true },
  { name: 'Foco Estendido', nameEn: 'Extended Focus', work: 45, break: 10, longBreak: 20, description: 'Aulas e leituras mais longas', descriptionEn: 'Longer lessons and readings', builtIn: true },
  { name: 'Deep Work', nameEn: 'Deep Work', work: 50, break: 10, longBreak: 30, description: 'Concentração profunda', descriptionEn: 'Deep concentration', builtIn: true },
  { name: 'Ritmo 52/17', nameEn: '52/17 Rhythm', work: 52, break: 17, longBreak: 30, description: 'Alta produtividade com pausas generosas', descriptionEn: 'High output with generous breaks', builtIn: true },
  { name: 'Ultradiano', nameEn: 'Ultradian', work: 90, break: 20, longBreak: 30, description: 'Blocos longos de estudo intenso', descriptionEn: 'Long blocks of intense study', builtIn: true },
];

const DEFAULT_PRESET: Preset = BUILT_IN_PRESETS[0];

const defaultPresets: Preset[] = [];

/** Nome seguro para métricas: presets prontos pelo nome, os do usuário como 'custom'. */
export function presetLabel(p: Preset): string {
  return p.builtIn ? p.name : 'custom';
}

function isValidPreset(p: unknown): p is Preset {
  const v = p as Preset;
  return !!v && typeof v.name === 'string' && v.work > 0 && v.break > 0 && v.longBreak > 0;
}

export function usePomodoroTimer() {
  const [presets, setPresets] = useState<Preset[]>(() => {
    const saved = localStorage.getItem(PRESETS_KEY);
    return saved ? JSON.parse(saved) : defaultPresets;
  });
  const [presetIndex, setPresetIndex] = useState(0);
  // Preset em uso (pronto, salvo ou personalizado na hora).
  const [activePreset, setActivePreset] = useState<Preset>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_PRESET_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      if (isValidPreset(parsed)) return parsed;
    } catch {
      // ignore
    }
    return DEFAULT_PRESET;
  });
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
  // Ciclos de foco concluídos AGORA nesta aba (não conta os sincronizados de outra aba
  // nem os registrados em silêncio) — a página usa para tocar o efeito de conclusão.
  const [completedCycles, setCompletedCycles] = useState(0);

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
  // Último estado gravado por esta aba (só regrava quando algo muda de verdade).
  const lastWrittenStateRef = useRef<string | null>(null);
  // Estado mais recente para callbacks chamados de closures antigas (ex.: uma
  // busca iniciada no primeiro render da página Foco que termina depois).
  const liveRef = useRef({ isRunning, selectedCourse, selectedModule, timerStartedAt, mode, sessions, timeLeft });
  liveRef.current = { isRunning, selectedCourse, selectedModule, timerStartedAt, mode, sessions, timeLeft };

  // Keep the display end-time state in sync with the ref. Piggybacks on the
  // per-second timeLeft updates so the UI can show the projected end hour.
  useEffect(() => {
    setEndTime(isRunning ? targetEndTimeRef.current : null);
  }, [isRunning, timeLeft]);

  const preset = activePreset;

  useEffect(() => {
    localStorage.setItem(ACTIVE_PRESET_KEY, JSON.stringify(activePreset));
  }, [activePreset]);

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
          const remaining = Math.max(0, Math.ceil((state.targetEndTime - now) / 1000));
          
          if (remaining > 0) {
            setTimeLeft(remaining);
            setIsRunning(true);
            targetEndTimeRef.current = state.targetEndTime;
          } else {
            // Timer completed while user was away (tab closed, sleep, offline).
            // O ciclo terminou inteiro: tempo cronometrado = total do ciclo (pausas não contam).
            setIsRunning(false);
            targetEndTimeRef.current = null;
            const totalTimeSeconds = state.customTotalTime || preset.work * 60;
            if (state.mode === 'work') {
              // Volta pronto para o próximo ciclo — nunca parado em 00:00, que
              // registraria a mesma sessão de novo ao apertar Iniciar.
              setSessions((state.sessions || 0) + 1);
              setMode('work');
              setTimeLeft(totalTimeSeconds);
            } else {
              setMode('work');
              setTimeLeft(preset.work * 60);
              setCustomTotalTime(null);
            }

            if (state.mode === 'work' && state.selectedCourse && state.timerStartedAt) {
              const durationMinutes = Math.round(totalTimeSeconds / 60);
              
              if (durationMinutes >= 1) {
                supabase.auth.getUser().then(({ data: { user } }) => {
                  if (user) {
                    void persistFocusSession({
                      userId: user.id,
                      courseId: state.selectedCourse,
                      moduleId: state.selectedModule || null,
                      durationMinutes,
                      sessionType: 'work',
                      ended: 'finished_while_away',
                      plannedMinutes: Math.round(totalTimeSeconds / 60),
                      presetName: presetLabel(preset),
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
      // Rodando, o horário de término já descreve tudo: não regrava a cada segundo
      // (isso apagava a pausa feita em outra aba e fazia a aba esquecida avisar).
      remainingTime: isRunning ? 0 : timeLeft,
      customTotalTime,
      // Mantido também pausado: indica uma sessão iniciada que ainda não foi salva.
      timerStartedAt,
    };
    const serialized = JSON.stringify(state);
    if (serialized === lastWrittenStateRef.current) return;
    lastWrittenStateRef.current = serialized;
    localStorage.setItem(STORAGE_KEY, serialized);
  }, [mode, timeLeft, isRunning, sessions, presetIndex, selectedCourse, selectedModule, isInitialized, customTotalTime, timerStartedAt]);

  // Adota o estado salvo por outra aba/janela do app (pausou, zerou, concluiu ou
  // começou outro ciclo). Nunca registra sessão nem avisa: quem mudou já fez isso.
  const adoptStoredState = useCallback((state: PomodoroState) => {
    setMode(state.mode || 'work');
    setSessions(state.sessions || 0);
    setSelectedCourse(state.selectedCourse || '');
    setSelectedModule(state.selectedModule || '');
    setCustomTotalTime(state.customTotalTime || null);
    setTimerStartedAt(state.timerStartedAt || null);
    const now = Date.now();
    if (state.targetEndTime && state.targetEndTime > now) {
      setPendingBreak(null);
      targetEndTimeRef.current = state.targetEndTime;
      setTimeLeft(Math.ceil((state.targetEndTime - now) / 1000));
      setIsRunning(true);
    } else {
      targetEndTimeRef.current = null;
      setIsRunning(false);
      setTimeLeft(Math.max(0, state.remainingTime ?? preset.work * 60));
    }
  }, [preset.work]);

  // Mantém as abas abertas em sincronia: uma aba esquecida não avisa sobre um
  // ciclo que já foi pausado, zerado ou concluído em outra.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      let state: PomodoroState;
      try {
        state = JSON.parse(e.newValue);
      } catch {
        return;
      }
      const live = liveRef.current;
      const running = !!state.targetEndTime;
      const changed =
        running !== live.isRunning ||
        (running && state.targetEndTime !== targetEndTimeRef.current) ||
        (!running && (state.remainingTime ?? 0) !== live.timeLeft) ||
        (state.mode || 'work') !== live.mode ||
        (state.selectedCourse || '') !== live.selectedCourse ||
        (state.selectedModule || '') !== live.selectedModule ||
        (state.timerStartedAt || null) !== live.timerStartedAt ||
        (state.sessions || 0) !== live.sessions;
      if (changed) adoptStoredState(state);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [adoptStoredState]);

  // Handle timer completion
  const handleTimerComplete = useCallback(async () => {
    const target = targetEndTimeRef.current;
    const now = Date.now();
    const stored = readStoredState();
    const check = checkCycleCompletion({
      targetEndTime: target,
      now,
      storedTargetEndTime: stored ? stored.targetEndTime ?? null : undefined,
      claimedTarget: readClaimedTarget(),
    });

    if (check === 'no_cycle') {
      // Sem horário de término válido: não é um fim de ciclo de verdade.
      setIsRunning(false);
      return;
    }
    if (check === 'not_finished') {
      setTimeLeft(Math.max(1, Math.ceil((target! - now) / 1000)));
      return;
    }
    if (check === 'stale') {
      if (stored) adoptStoredState(stored);
      else {
        targetEndTimeRef.current = null;
        setIsRunning(false);
      }
      return;
    }

    try {
      localStorage.setItem(COMPLETED_KEY, String(target));
    } catch {
      // ignore
    }
    const silent = check === 'complete_silent';
    setIsRunning(false);
    targetEndTimeRef.current = null;

    if (!silent) {
    // Play notification sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVIzpdfhsGkdD22p4txuQC5xt+jXaC8bdbnk1lgfLqLY3po+EIi92dBXHD6k0thzKiCo0tdsJiuq1tljKy2q1tdqLSuo1dlsKyer1NlrJyiq09hnJSmr09loKCis1NhqKSmr1NlpKCms1NhqKSmr1NloKCms1NhqKSms1NlpKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NhoKSms1NhqKSmr1NhoKSms1NhqKSmr1NhoKSms1NhqKSmr1NhoKSms1NhqKSmr1NhoKSms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NlpKCms1NlqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NhoKCms1NhqKSmr1NhoKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms1NlpKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSmr1NloKCms1NhqKSms1NloKCms');
      audio.play().catch(() => {});
    } catch (e) {
      // Ignore audio errors
    }

    // Show notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('FD-Planner Timer', {
          body: mode === 'work' ? 'Hora da pausa!' : 'Hora de voltar ao foco!',
          icon: '/favicon.ico',
          // Mesma etiqueta: um aviso repetido substitui o anterior em vez de empilhar.
          tag: 'fdplanner-focus-cycle',
        });
      } catch {
        // ignore (ex.: navegador exige service worker para notificações)
      }
    }
    }

    if (mode === 'work') {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      if (!silent) setCompletedCycles((c) => c + 1);
      
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
                ended: 'timer_finished',
                plannedMinutes: durationMinutes,
                presetName: presetLabel(preset),
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
  }, [mode, sessions, preset, selectedCourse, selectedModule, customTotalTime, settings, adoptStoredState]);

  // Timer logic — timestamp based so it stays accurate even when the tab is
  // backgrounded, the page is closed, or the user navigates away. Instead of
  // relying on requestAnimationFrame (which is throttled/paused off-screen and
  // caused the "freeze" bug), we recompute the remaining time from the absolute
  // targetEndTime on every tick and whenever the tab becomes visible again.
  useEffect(() => {
    if (!isRunning) return;

    const sync = () => {
      if (!targetEndTimeRef.current) return;
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
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

  // Começa um trecho novo (foco ou pausa) já com horário de término.
  const startSegment = useCallback((segmentMode: 'work' | 'break' | 'longBreak', seconds: number) => {
    const now = Date.now();
    setPendingBreak(null);
    setMode(segmentMode);
    setTimeLeft(seconds);
    setCustomTotalTime(seconds);
    targetEndTimeRef.current = now + seconds * 1000;
    setTimerStartedAt(now);
    setIsRunning(true);
    requestNotificationPermission();
  }, []);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      // Pausing - capture remaining time from the ref before clearing it
      if (targetEndTimeRef.current) {
        const remaining = Math.ceil((targetEndTimeRef.current - Date.now()) / 1000);
        // O ciclo já acabou: deixa a conclusão acontecer (não pausa em 00:00).
        if (remaining <= 0) return;
        setTimeLeft(remaining);
      }
      targetEndTimeRef.current = null;
      setIsRunning(false);
      // Manter timerStartedAt ao pausar para poder retomar corretamente
    } else {
      // Em 00:00 (ciclo recém-concluído) nunca inicia um cronômetro de 0 segundos —
      // isso disparava na hora um aviso falso de "ciclo concluído" e contava a sessão de novo.
      if (timeLeft <= 0) {
        if (pendingBreak) startSegment(pendingBreak.mode, pendingBreak.seconds);
        else startSegment('work', mode === 'work' && customTotalTime ? customTotalTime : preset.work * 60);
        return;
      }

      // Starting the timer - set target end time
      const now = Date.now();
      targetEndTimeRef.current = now + timeLeft * 1000;
      
      // Se não temos timerStartedAt, significa que é um novo início (não uma retomada)
      if (!timerStartedAt) {
        setTimerStartedAt(now);
        if (mode === 'work') {
          window.__lovableEvents?.track?.('project.focus_session_started', {
            planned_minutes: Math.round(timeLeft / 60),
            preset: presetLabel(preset),
            has_course: !!selectedCourse,
            has_module: !!selectedModule,
          });
        }
      }
      
      setIsRunning(true);
      requestNotificationPermission();
    }
  }, [isRunning, timeLeft, timerStartedAt, mode, preset, selectedCourse, selectedModule, pendingBreak, customTotalTime, startSegment]);

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

    // Tempo realmente cronometrado (pausas não contam): total do ciclo − restante.
    const totalTimeSeconds = customTotalTime || preset.work * 60;
    const remainingSeconds = isRunning && targetEndTimeRef.current
      ? Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000))
      : timeLeft;
    const elapsedSeconds = Math.min(totalTimeSeconds, Math.max(0, totalTimeSeconds - remainingSeconds));
    const elapsedMinutes = Math.round(elapsedSeconds / 60);

    setIsRunning(false);
    targetEndTimeRef.current = null;

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
            ended: 'stopped_early',
            plannedMinutes: Math.round(totalTimeSeconds / 60),
            presetName: presetLabel(preset),
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
    setActivePreset({ ...newPreset });
    setPendingBreak(null);
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setTimerStartedAt(null);
    setMode('work');
    setTimeLeft(newPreset.work * 60);
    // Duração explícita: o tempo cronometrado com o preset é o que vai para as metas.
    setCustomTotalTime(newPreset.work * 60);
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
    startSegment(pendingBreak.mode, pendingBreak.seconds);
  }, [pendingBreak, startSegment]);

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
    if (presets[index] && presets[index].name === activePreset.name && !activePreset.builtIn) {
      setActivePreset({ ...newPreset });
    }
    
    // If updating current preset, also update timeLeft
    if (index === presetIndex && !isRunning) {
      const time = mode === 'work' 
        ? newPreset.work 
        : mode === 'break' 
          ? newPreset.break 
          : newPreset.longBreak;
      setTimeLeft(time * 60);
    }
  }, [presetIndex, isRunning, mode, presets, activePreset]);

  const addCustomPreset = useCallback((newPreset: Preset) => {
    setPresets(prev => [...prev, newPreset]);
  }, []);

  const removePreset = useCallback((index: number) => {
    if (!presets[index]) return;

    setPresets(prev => prev.filter((_, i) => i !== index));
    if (presetIndex >= index && presetIndex > 0) {
      setPresetIndex(prev => prev - 1);
    }
  }, [presets, presetIndex]);

  const totalTime = customTotalTime || (mode === 'work' 
    ? preset.work * 60 
    : mode === 'break' 
      ? preset.break * 60 
      : preset.longBreak * 60);

  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // Reset timer when course changes (only if not running)
  const handleCourseChange = useCallback((courseId: string) => {
    // Lê o estado atual (não o do render em que o callback foi criado): uma
    // chamada atrasada não pode zerar um cronômetro restaurado ao voltar à página.
    const live = liveRef.current;
    if (courseId !== live.selectedCourse) {
      setPendingBreak(null);
      setSelectedCourse(courseId);
      // Trocar de curso invalida o módulo selecionado
      setSelectedModule('');
      // Reset timer state when changing course (if not running)
      if (!live.isRunning) {
        setTimeLeft(preset.work * 60);
        setCustomTotalTime(null);
        setMode('work');
        targetEndTimeRef.current = null;
        setTimerStartedAt(null);
      }
    }
  }, [preset.work]);

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
    builtInPresets: BUILT_IN_PRESETS,
    updatePreset,
    addCustomPreset,
    removePreset,
    presetIndex,
    customTotalTime,
    currentElapsedMinutes,
    // Wall-clock timestamps for the running session (ms since epoch).
    sessionStartTime: timerStartedAt,
    /** true depois de restaurar o estado salvo (cronômetro em andamento ou pausado). */
    isInitialized,
    sessionEndTime: endTime,
    /** Ciclos de foco concluídos agora nesta aba (para o efeito de conclusão). */
    completedCycles,
  };
}
