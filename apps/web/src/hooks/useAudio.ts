'use client';

import { useCallback, useRef, useState } from 'react';

// ─── Web Audio API synthesizer — zero file dependencies ─────────────
// Each sound is a tiny synthesized waveform that plays instantly.

type SynthFn = (ctx: AudioContext, dest: AudioNode) => void;

const SOUNDS: Record<string, SynthFn> = {
  stretch: (ctx, dest) => {
    // Short, soft click — path extension
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain).connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  },

  backspace: (ctx, dest) => {
    // Descending blip — undo
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  },

  fish: (ctx, dest) => {
    // Bright rising chirp — treat collected (+time)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain).connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  },

  yarn: (ctx, dest) => {
    // Two-tone sparkle — yarn collected (+score)
    [800, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.07;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  },

  goal: (ctx, dest) => {
    // Triumphant arpeggio — reached goal
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  },

  win: (ctx, dest) => {
    // Full fanfare — game won
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  },

  water: (ctx, dest) => {
    // Filtered noise splash — water reset
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    source.connect(filter).connect(gain).connect(dest);
    source.start();
  },

  countdown: (ctx, dest) => {
    // Short metronome tick
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain).connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  },

  go: (ctx, dest) => {
    // Higher, brighter tick — "GO!"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1320;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  },
};

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const getContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterGainRef.current = master;
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return { ctx: ctxRef.current, dest: masterGainRef.current! };
  }, []);

  const playSound = useCallback((name: string, _volume = 0.5) => {
    if (!soundEnabled) return;
    const synth = SOUNDS[name];
    if (!synth) return;
    try {
      const { ctx, dest } = getContext();
      synth(ctx, dest);
    } catch {
      // AudioContext not available (SSR or unsupported browser)
    }
  }, [soundEnabled, getContext]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  return { playSound, toggleSound, soundEnabled };
}
