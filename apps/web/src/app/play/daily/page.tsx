'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Grid from '@/components/game/Grid';
import BackgroundParticles from '@/components/effects/BackgroundParticles';
import CountdownOverlay from '@/components/effects/CountdownOverlay';
import VictoryEffects from '@/components/effects/VictoryEffects';
import { useGameEngine } from '@/hooks/useGameEngine';
import { useAudio } from '@/hooks/useAudio';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useDailySubmit } from '@/hooks/useDailySubmit';
import { GameEffect, Point } from '@nekris/engine';

function getDailySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

export default function DailyPage() {
  const { playSound, toggleSound, soundEnabled } = useAudio();
  const { submitScore, submitting, submitted } = useDailySubmit();
  const [bonuses, setBonuses] = useState<{ id: number; text: string }[]>([]);
  const [showCountdown, setShowCountdown] = useState(true);
  const [scoreKey, setScoreKey] = useState(0);
  const [shared, setShared] = useState(false);
  const bonusId = useRef(0);
  const dailySeed = getDailySeed();

  const handleEffects = useCallback((effects: GameEffect[]) => {
    for (const effect of effects) {
      if (effect.type === 'AUDIO') {
        playSound(effect.sound);
      }
      if (effect.type === 'TIMER_ADD') {
        const id = bonusId.current++;
        setBonuses(prev => [...prev, { id, text: `+${effect.seconds}s` }]);
        setTimeout(() => setBonuses(prev => prev.filter(b => b.id !== id)), 1800);
      }
      if (effect.type === 'WATER_RESET') {
        playSound('water');
      }
    }
    // Trigger score pop animation
    setScoreKey(k => k + 1);
  }, [playSound]);

  const {
    level, state, timeLeft, isTreatActive, isYarnActive,
    isDragging, setIsDragging, gameResult, handleMove, moves,
  } = useGameEngine({
    seed: dailySeed,
    levelIndex: 1,
    onEffects: handleEffects,
  });

  // Auto-submit score on game result
  useEffect(() => {
    if (gameResult && state && !submitted) {
      submitScore({
        seed: dailySeed,
        score: state.score,
        timeLeftMs: timeLeft * 1000,
        moveCount: state.moveCount,
        moves: moves,
      });
    }
  }, [gameResult]);

  // Keyboard controls
  const handleKeyMove = useCallback((dir: { x: number; y: number }) => {
    if (!state || !level) return;
    const head = state.path[state.path.length - 1];
    const target: Point = { x: head.x + dir.x, y: head.y + dir.y };
    if (target.x >= 0 && target.x < level.width && target.y >= 0 && target.y < level.height) {
      handleMove(target);
    }
  }, [state, level, handleMove]);

  useKeyboardControls(handleKeyMove);

  if (!level || !state) return null;

  const timerDanger = timeLeft <= 5 && timeLeft > 0;
  const progressPercent = Math.min((state.path.length / level.targetCount) * 100, 100);

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      onMouseUp={() => setIsDragging(false)}
      onTouchEnd={() => setIsDragging(false)}
    >
      {/* Background atmosphere */}
      <BackgroundParticles />

      {/* Countdown overlay */}
      {showCountdown && (
        <CountdownOverlay
          onComplete={() => setShowCountdown(false)}
          playSound={playSound}
        />
      )}

      {/* Victory / Defeat effects */}
      <VictoryEffects show={!!gameResult} type={gameResult ?? 'win'} />

      {/* Floating time bonuses */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 pointer-events-none z-50">
        <AnimatePresence>
          {bonuses.map(b => (
            <motion.div
              key={b.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -50, scale: 1.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              className="text-xl font-bold absolute neon-text-strong"
              style={{ color: '#00ff88' }}
            >
              {b.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <motion.div
        className="mb-4 text-center z-10"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold neon-text" style={{ color: '#00ff88' }}>
            NEKRIS Daily
          </h1>
          <button
            onClick={toggleSound}
            className="text-sm px-2 py-1 rounded opacity-60 hover:opacity-100 transition-all hover:scale-110"
            style={{ color: '#666' }}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
        <p className="text-[#666] text-sm mt-1">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      {/* Game Area */}
      <AnimatePresence mode="wait">
        {gameResult ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-6 p-10 rounded-2xl z-10 relative"
            style={{
              background: 'rgba(26, 26, 46, 0.9)',
              border: `1px solid ${gameResult === 'win' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 68, 68, 0.2)'}`,
              boxShadow: gameResult === 'win'
                ? '0 0 60px rgba(0, 255, 136, 0.1)'
                : '0 0 40px rgba(255, 68, 68, 0.1)',
            }}
          >
            <motion.h2
              className={`text-5xl font-black ${gameResult === 'win' ? 'neon-text-strong' : 'neon-text-danger'}`}
              style={{ color: gameResult === 'win' ? '#00ff88' : '#ff4444' }}
              animate={
                gameResult === 'win'
                  ? { scale: [1, 1.15, 1], rotate: [0, -2, 2, 0] }
                  : { x: [-4, 4, -4, 2, -1, 0] }
              }
              transition={{ duration: 0.6 }}
            >
              {gameResult === 'win' ? 'Clear!' : 'Time Up'}
            </motion.h2>

            <motion.div
              className="text-7xl font-black text-white"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: [0, 1.3, 1], rotate: [10, -3, 0] }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {state.score.toLocaleString()}
            </motion.div>
            <p className="text-[#666] text-sm -mt-2">Points</p>

            <motion.div
              className="flex gap-6 text-sm mt-2"
              style={{ color: '#888' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <span>{state.moveCount} moves</span>
              <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} left</span>
            </motion.div>

            {/* Actions */}
            <motion.div
              className="flex gap-3 mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <button
                onClick={() => {
                  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const emoji = gameResult === 'win' ? '🟢' : '🔴';
                  const text = `${emoji} NEKRIS Daily ${date}\n${state.score.toLocaleString()} pts | ${state.moveCount} moves\nnekris.online`;
                  if (navigator.share) {
                    navigator.share({ text }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(text).then(() => setShared(true));
                    setTimeout(() => setShared(false), 2000);
                  }
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: 'rgba(0, 255, 136, 0.1)',
                  color: '#00ff88',
                  border: '1px solid rgba(0, 255, 136, 0.15)',
                }}
              >
                {shared ? 'Copied!' : 'Share'}
              </button>
              <Link
                href="/leaderboard"
                className="px-4 py-2 rounded-xl text-sm font-bold"
                style={{ color: '#888', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                Leaderboard
              </Link>
              <Link
                href="/"
                className="px-4 py-2 rounded-xl text-sm font-bold"
                style={{ color: '#666' }}
              >
                Menu
              </Link>
            </motion.div>

            {/* Submit status */}
            {submitting && (
              <motion.p
                className="text-xs mt-2"
                style={{ color: '#555' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Saving score...
              </motion.p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: showCountdown ? 0.4 : 1, scale: showCountdown ? 0.97 : 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center z-10"
          >
            <Grid
              level={level}
              path={state.path}
              collectedSet={state.collectedSet}
              isTreatActive={isTreatActive}
              isYarnActive={isYarnActive}
              onCellMouseDown={(p) => {
                if (showCountdown) return;
                setIsDragging(true);
                handleMove(p);
              }}
              onCellMouseEnter={(p) => {
                if (showCountdown) return;
                if (isDragging) handleMove(p);
              }}
            />

            {/* Timer & Score bar */}
            <motion.div
              className="flex items-center gap-4 mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Timer */}
              <motion.div
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${timerDanger ? 'animate-shake' : ''}`}
                style={{
                  background: timerDanger ? '#2a1a1a' : '#1a1a2e',
                  border: `1px solid ${timerDanger ? 'rgba(255, 68, 68, 0.2)' : 'rgba(0, 255, 136, 0.08)'}`,
                }}
                animate={timerDanger ? { scale: [1, 1.03, 1] } : {}}
                transition={timerDanger ? { duration: 0.5, repeat: Infinity } : {}}
              >
                <span
                  className={`text-sm ${timerDanger ? 'neon-text-danger' : ''}`}
                  style={{ color: timerDanger ? '#ff4444' : '#00ff88' }}
                >
                  ⏱
                </span>
                <span
                  className="font-mono font-bold tabular-nums"
                  style={{ color: timerDanger ? '#ff4444' : '#ffffff' }}
                >
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </motion.div>

              {/* Score */}
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: '#1a1a2e',
                  border: '1px solid rgba(0, 255, 136, 0.08)',
                }}
              >
                <motion.span
                  className="font-mono font-bold text-white tabular-nums"
                  key={scoreKey}
                  initial={{ scale: 1.4, color: '#00ff88' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  {state.score.toLocaleString()}
                </motion.span>
                <span className="text-[#666] text-sm">pts</span>
              </div>
            </motion.div>

            {/* Progress bar */}
            <div className="mt-3 w-52 h-1.5 rounded-full overflow-hidden relative" style={{ background: '#1a1a2e' }}>
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #00ff88, #00ddff)',
                  boxShadow: '0 0 8px rgba(0, 255, 136, 0.4)',
                }}
                initial={{ width: '0%' }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              />
            </div>

            {/* Collected counter */}
            <motion.p
              className="text-xs mt-2 tabular-nums"
              style={{ color: '#555' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {state.collectedSet.size} / {level.targetCount} collected
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
