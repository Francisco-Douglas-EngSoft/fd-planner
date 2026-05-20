import { useCallback, useEffect, useState } from 'react';

type SoundType = 'bell' | 'chime' | 'digital' | 'gentle';

interface SoundConfig {
  name: string;
  frequency: number;
  duration: number;
  type: OscillatorType;
  envelope: 'short' | 'medium' | 'long';
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  bell: {
    name: 'Sino',
    frequency: 830,
    duration: 0.8,
    type: 'sine',
    envelope: 'long',
  },
  chime: {
    name: 'Carrilhão',
    frequency: 1046,
    duration: 0.5,
    type: 'triangle',
    envelope: 'medium',
  },
  digital: {
    name: 'Digital',
    frequency: 880,
    duration: 0.15,
    type: 'square',
    envelope: 'short',
  },
  gentle: {
    name: 'Suave',
    frequency: 523,
    duration: 1.2,
    type: 'sine',
    envelope: 'long',
  },
};

const STORAGE_KEY = 'fdplanner_focus_sound';

export function useFocusSounds() {
  const [selectedSound, setSelectedSound] = useState<SoundType>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as SoundType) || 'bell';
  });
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedSound);
  }, [selectedSound]);

  const playSound = useCallback((type?: SoundType) => {
    if (isMuted) return;

    const soundType = type || selectedSound;
    const config = SOUND_CONFIGS[soundType];

    try {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioContext = new (AudioContextClass!)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);

      // Envelope based on sound type
      const attackTime = 0.01;
      let decayTime: number;
      let sustainLevel: number;
      let releaseTime: number;

      switch (config.envelope) {
        case 'short':
          decayTime = 0.05;
          sustainLevel = 0.3;
          releaseTime = 0.1;
          break;
        case 'medium':
          decayTime = 0.1;
          sustainLevel = 0.5;
          releaseTime = 0.3;
          break;
        case 'long':
        default:
          decayTime = 0.2;
          sustainLevel = 0.6;
          releaseTime = 0.5;
      }

      // Apply ADSR envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + attackTime);
      gainNode.gain.linearRampToValueAtTime(sustainLevel * 0.5, audioContext.currentTime + attackTime + decayTime);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + config.duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration);

      // Play second note for richer sound
      if (soundType === 'chime' || soundType === 'bell') {
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.type = config.type;
          osc2.frequency.setValueAtTime(config.frequency * 1.5, audioContext.currentTime);
          gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
          gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + config.duration * 0.7);
          osc2.start();
          osc2.stop(audioContext.currentTime + config.duration * 0.7);
        }, 100);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [selectedSound, isMuted]);

  const playSuccessSound = useCallback(() => {
    if (isMuted) return;

    try {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioContext = new (AudioContextClass!)();
      const notes = [523, 659, 784, 1046]; // C5, E5, G5, C6

      notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioContext.currentTime);
        gain.gain.setValueAtTime(0, audioContext.currentTime + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + i * 0.15 + 0.05);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + i * 0.15 + 0.4);
        osc.start(audioContext.currentTime + i * 0.15);
        osc.stop(audioContext.currentTime + i * 0.15 + 0.4);
      });
    } catch (error) {
      console.error('Error playing success sound:', error);
    }
  }, [isMuted]);

  return {
    selectedSound,
    setSelectedSound,
    isMuted,
    setIsMuted,
    playSound,
    playSuccessSound,
    soundOptions: Object.entries(SOUND_CONFIGS).map(([key, config]) => ({
      value: key as SoundType,
      label: config.name,
    })),
  };
}
