'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  createPRNG, generateLevel, processMove, createInitialState,
  LevelData, EngineState, Point, GameEffect, MoveOptions,
  GAME_CONSTANTS, CellType,
} from '@nekris/engine';

interface UseGameEngineOptions {
  seed: number;
  levelIndex: number;
  onEffects?: (effects: GameEffect[]) => void;
}

export function useGameEngine({ seed, levelIndex, onEffects }: UseGameEngineOptions) {
  const [level, setLevel] = useState<LevelData | null>(null);
  const [state, setState] = useState<EngineState | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(GAME_CONSTANTS.INITIAL_TIME_SECONDS);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isTreatActive, setIsTreatActive] = useState(true);
  const [isYarnActive, setIsYarnActive] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);

  const levelStartTimeRef = useRef(0);
  const movesRef = useRef<{ point: Point; t: number }[]>([]);
  const gameStartTimeRef = useRef(0);

  // Generate level
  useEffect(() => {
    let gen: LevelData | null = null;
    for (let i = 1; i <= levelIndex; i++) {
      const levelRng = createPRNG(seed + i);
      gen = generateLevel(i, levelRng);
    }
    if (gen) {
      setLevel(gen);
      setState(createInitialState(gen));
      setTimerStarted(false);
      setIsTreatActive(true);
      setIsYarnActive(true);
      setGameResult(null);
      setTimeLeft(GAME_CONSTANTS.INITIAL_TIME_SECONDS);
      levelStartTimeRef.current = 0;
      gameStartTimeRef.current = Date.now();
      movesRef.current = [];
    }
  }, [seed, levelIndex]);

  // Timer countdown
  useEffect(() => {
    if (!timerStarted || gameResult || !state || state.isWon) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timerStarted, gameResult, state?.isWon]);

  // Game over on time out
  useEffect(() => {
    if (timeLeft === 0 && !state?.isWon && !gameResult) {
      setGameResult('lose');
    }
  }, [timeLeft, state?.isWon, gameResult]);

  // Collectible expiry — TREAT
  useEffect(() => {
    if (!level || !isTreatActive || levelStartTimeRef.current === 0) return;
    const totalLifetime = GAME_CONSTANTS.TREAT_MIN_LIFETIME_MS + level.targetCount * GAME_CONSTANTS.TREAT_SCALE_FACTOR_MS;
    const elapsed = Date.now() - levelStartTimeRef.current;
    const remaining = totalLifetime - elapsed;
    if (remaining <= 0) { setIsTreatActive(false); return; }
    const timer = setTimeout(() => setIsTreatActive(false), remaining);
    return () => clearTimeout(timer);
  }, [level, isTreatActive]);

  // Collectible expiry — YARN
  useEffect(() => {
    if (!level || !isYarnActive || levelStartTimeRef.current === 0) return;
    const totalLifetime = GAME_CONSTANTS.YARN_MIN_LIFETIME_MS + level.targetCount * GAME_CONSTANTS.YARN_SCALE_FACTOR_MS;
    const elapsed = Date.now() - levelStartTimeRef.current;
    const remaining = totalLifetime - elapsed;
    if (remaining <= 0) { setIsYarnActive(false); return; }
    const timer = setTimeout(() => setIsYarnActive(false), remaining);
    return () => clearTimeout(timer);
  }, [level, isYarnActive]);

  const handleMove = useCallback((point: Point) => {
    if (!level || !state || state.isWon || gameResult) return;

    // Start timer on first real move
    if (state.path.length === 1 && levelStartTimeRef.current === 0) {
      const last = state.path[0];
      if (Math.abs(last.x - point.x) + Math.abs(last.y - point.y) === 1) {
        levelStartTimeRef.current = Date.now();
        if (!timerStarted) setTimerStarted(true);
      }
    }

    const options: MoveOptions = { isTreatActive, isYarnActive };
    const result = processMove(state, point, level, options);

    if (result.valid) {
      setState(result.state);
      movesRef.current.push({ point, t: Date.now() - gameStartTimeRef.current });

      // Process effects
      for (const effect of result.effects) {
        if (effect.type === 'TIMER_ADD') {
          setTimeLeft(prev => prev + effect.seconds);
        }
        if (effect.type === 'WATER_RESET') {
          setState(createInitialState(level));
          levelStartTimeRef.current = 0;
          setIsTreatActive(true);
          setIsYarnActive(true);
        }
        if (effect.type === 'WIN') {
          setGameResult('win');
        }
      }

      onEffects?.(result.effects);
    }
  }, [level, state, isTreatActive, isYarnActive, timerStarted, gameResult, onEffects]);

  return {
    level,
    state,
    timeLeft,
    isTreatActive,
    isYarnActive,
    isDragging,
    setIsDragging,
    gameResult,
    handleMove,
    moves: movesRef.current,
    timerStarted,
  };
}
