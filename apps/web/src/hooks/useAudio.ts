'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Sound name → local audio path mapping
const SOUND_MAP: Record<string, string> = {
  stretch: '/audio/stretch.mp3',
  backspace: '/audio/backspace.mp3',
  fish: '/audio/fish.mp3',
  yarn: '/audio/yarn.mp3',
  goal: '/audio/goal.mp3',
  win: '/audio/win.mp3',
  water: '/audio/water.mp3',
  countdown: '/audio/countdown.mp3',
  go: '/audio/go.mp3',
};

export function useAudio() {
  const audioCache = useRef<Record<string, HTMLAudioElement>>({});
  const bgSource = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bgPlaying, setBgPlaying] = useState(false);

  // Preload all game sounds on mount
  useEffect(() => {
    Object.entries(SOUND_MAP).forEach(([, path]) => {
      if (!audioCache.current[path]) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audioCache.current[path] = audio;
      }
    });
  }, []);

  // Pause/resume on tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        bgSource.current?.pause();
      } else if (bgPlaying && soundEnabled) {
        bgSource.current?.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [bgPlaying, soundEnabled]);

  const playSound = useCallback((name: string, volume = 0.5) => {
    if (!soundEnabled) return;
    const path = SOUND_MAP[name];
    if (!path) return;

    let audio = audioCache.current[path];
    if (!audio) {
      audio = new Audio(path);
      audio.preload = 'auto';
      audioCache.current[path] = audio;
    }

    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  }, [soundEnabled]);

  const playBg = useCallback((path: string, volume = 0.3) => {
    if (bgSource.current?.src.endsWith(path)) {
      if (!bgPlaying && soundEnabled) {
        bgSource.current.play().catch(() => {});
        setBgPlaying(true);
      }
      return;
    }
    bgSource.current?.pause();
    const audio = new Audio(path);
    audio.loop = true;
    audio.volume = volume;
    if (soundEnabled) audio.play().catch(() => {});
    bgSource.current = audio;
    setBgPlaying(true);
  }, [bgPlaying, soundEnabled]);

  const stopAll = useCallback(() => {
    bgSource.current?.pause();
    Object.values(audioCache.current).forEach(a => {
      a.pause();
      a.currentTime = 0;
    });
    setBgPlaying(false);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      if (prev) {
        bgSource.current?.pause();
        setBgPlaying(false);
      }
      return !prev;
    });
  }, []);

  return { playSound, playBg, stopAll, toggleSound, soundEnabled };
}
