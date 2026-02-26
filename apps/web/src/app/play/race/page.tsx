'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Grid from '@/components/game/Grid';
import OpponentMinimap from '@/components/game/OpponentMinimap';
import BackgroundParticles from '@/components/effects/BackgroundParticles';
import CountdownOverlay from '@/components/effects/CountdownOverlay';
import VictoryEffects from '@/components/effects/VictoryEffects';
import { useGameEngine } from '@/hooks/useGameEngine';
import { useAudio } from '@/hooks/useAudio';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { usePartySocket } from '@/hooks/usePartySocket';
import { useAuth } from '@/contexts/AuthContext';
import { GameEffect, Point, getTier } from '@nekris/engine';

// ─── Types ──────────────────────────────────────────────────────────
type Phase = 'connecting' | 'queuing' | 'matched' | 'countdown' | 'playing' | 'finished';

interface MatchResult {
  winner: string;
  myElo: number;
  eloChange: number;
  myScore: number;
  opScore: number;
  opName: string;
  myTier: string;
}

interface OpponentInfo {
  name: string;
  elo: number;
  tier: string;
}

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || '';

export default function RacePage() {
  const { user, profile } = useAuth();
  const { playSound, toggleSound, soundEnabled } = useAudio();

  // ─── Phase state ────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('connecting');
  const [queuePosition, setQueuePosition] = useState(0);
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [gameSeed, setGameSeed] = useState(0);
  const [roomId, setRoomId] = useState('');
  const [disconnectTimer, setDisconnectTimer] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(3);

  // ─── Opponent tracking ──────────────────────────────────────────
  const [opponentPath, setOpponentPath] = useState<Point[]>([]);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentFinished, setOpponentFinished] = useState(false);

  // ─── Animation state ───────────────────────────────────────────
  const [showCountdown, setShowCountdown] = useState(false);
  const [bonuses, setBonuses] = useState<{ id: number; text: string }[]>([]);
  const [scoreKey, setScoreKey] = useState(0);
  const bonusId = useRef(0);

  const myName = profile?.display_name || user?.email?.split('@')[0] || 'Player';
  const myElo = profile?.elo ?? 1000;

  // ─── Matchmaking socket ─────────────────────────────────────────
  const handleMatchmakingMsg = useCallback((msg: unknown) => {
    const data = msg as Record<string, unknown>;
    switch (data.type) {
      case 'QUEUE_STATUS':
        setQueuePosition(data.position as number);
        break;
      case 'MATCH_FOUND':
        setRoomId(data.roomId as string);
        setGameSeed(data.seed as number);
        setOpponent(data.opponent as OpponentInfo);
        setPhase('matched');
        playSound('goal');
        break;
      case 'ERROR':
        console.error('[matchmaking]', data.message);
        break;
    }
  }, [playSound]);

  const matchmaking = usePartySocket({
    host: PARTYKIT_HOST,
    party: 'matchmaking',
    room: 'global',
    onMessage: handleMatchmakingMsg,
    onOpen: () => {
      setPhase('queuing');
      matchmaking.send({
        type: 'QUEUE_JOIN',
        mode: 'quick',
        userId: user?.id || 'anon',
        name: myName,
        elo: myElo,
      });
    },
    enabled: !!PARTYKIT_HOST && phase === 'connecting',
  });

  // ─── Game room socket ───────────────────────────────────────────
  const handleGameMsg = useCallback((msg: unknown) => {
    const data = msg as Record<string, unknown>;
    switch (data.type) {
      case 'GAME_INIT':
        // Room confirmed
        break;
      case 'WAITING_FOR_READY':
        // Auto-ready
        gameRoom.send({ type: 'READY' });
        break;
      case 'COUNTDOWN':
        setCountdownSeconds(data.seconds as number);
        setPhase('countdown');
        setShowCountdown(true);
        break;
      case 'GAME_START':
        setPhase('playing');
        setShowCountdown(false);
        break;
      case 'OPPONENT_MOVE': {
        const point = data.point as Point;
        setOpponentPath(prev => [...prev, point]);
        setOpponentProgress(data.progress as number);
        break;
      }
      case 'OPPONENT_FINISH':
        setOpponentFinished(true);
        setOpponentScore(data.score as number);
        break;
      case 'OPPONENT_DISCONNECT':
        setDisconnectTimer(data.timeout as number);
        break;
      case 'MATCH_RESULT':
        setMatchResult(data as unknown as MatchResult);
        setPhase('finished');
        break;
      case 'ERROR':
        console.error('[gameRoom]', data.message);
        break;
    }
  }, []);

  const gameRoom = usePartySocket({
    host: PARTYKIT_HOST,
    room: roomId,
    onMessage: handleGameMsg,
    onOpen: () => {
      gameRoom.send({
        type: 'JOIN',
        userId: user?.id || 'anon',
        name: myName,
        elo: myElo,
        seed: gameSeed,
      });
    },
    enabled: !!roomId && phase === 'matched',
  });

  // ─── Game engine ────────────────────────────────────────────────
  const handleEffects = useCallback((effects: GameEffect[]) => {
    for (const effect of effects) {
      if (effect.type === 'AUDIO') playSound(effect.sound);
      if (effect.type === 'TIMER_ADD') {
        const id = bonusId.current++;
        setBonuses(prev => [...prev, { id, text: `+${effect.seconds}s` }]);
        setTimeout(() => setBonuses(prev => prev.filter(b => b.id !== id)), 1800);
      }
      if (effect.type === 'WIN') {
        // Send finish to server
        gameRoom.send({
          type: 'FINISH',
          moves: engine.moves,
          finalScore: engine.state?.score ?? 0,
        });
      }
    }
    setScoreKey(k => k + 1);
  }, [playSound]);

  const engine = useGameEngine({
    seed: gameSeed || 1,
    levelIndex: 1,
    onEffects: handleEffects,
  });

  // ─── Relay moves to server ─────────────────────────────────────
  const handleMove = useCallback((point: Point) => {
    if (phase !== 'playing') return;
    engine.handleMove(point);
    gameRoom.send({ type: 'MOVE', point, t: Date.now() });
  }, [phase, engine.handleMove]);

  // ─── Keyboard controls ─────────────────────────────────────────
  const handleKeyMove = useCallback((dir: { x: number; y: number }) => {
    if (!engine.state || !engine.level) return;
    const head = engine.state.path[engine.state.path.length - 1];
    const target: Point = { x: head.x + dir.x, y: head.y + dir.y };
    if (target.x >= 0 && target.x < engine.level.width && target.y >= 0 && target.y < engine.level.height) {
      handleMove(target);
    }
  }, [engine.state, engine.level, handleMove]);

  useKeyboardControls(handleKeyMove);

  // ─── Disconnect timer countdown ────────────────────────────────
  useEffect(() => {
    if (disconnectTimer <= 0) return;
    const timer = setInterval(() => {
      setDisconnectTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [disconnectTimer]);

  // ─── No PartyKit configured ────────────────────────────────────
  if (!PARTYKIT_HOST) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-4">
        <BackgroundParticles />
        <motion.div
          className="text-center z-10 p-8 rounded-2xl"
          style={{ background: 'rgba(26, 26, 46, 0.9)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h2 className="text-2xl font-bold text-white mb-2">Quick Race</h2>
          <p className="text-[#666] text-sm mb-4">PartyKit server not configured.</p>
          <p className="text-[#555] text-xs mb-6">
            Set NEXT_PUBLIC_PARTYKIT_HOST in .env.local to enable multiplayer.
          </p>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(0, 255, 136, 0.1)', color: '#00ff88', border: '1px solid rgba(0, 255, 136, 0.15)' }}
          >
            Back to Menu
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      onMouseUp={() => engine.setIsDragging(false)}
      onTouchEnd={() => engine.setIsDragging(false)}
    >
      <BackgroundParticles />

      {/* Countdown overlay */}
      {showCountdown && (
        <CountdownOverlay
          onComplete={() => setShowCountdown(false)}
          playSound={playSound}
        />
      )}

      {/* Victory / Defeat effects */}
      {matchResult && (
        <VictoryEffects
          show
          type={matchResult.eloChange > 0 ? 'win' : 'lose'}
        />
      )}

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

      <AnimatePresence mode="wait">
        {/* ─── QUEUING PHASE ─────────────────────────────────── */}
        {(phase === 'connecting' || phase === 'queuing') && (
          <motion.div
            key="queue"
            className="flex flex-col items-center gap-6 z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h1 className="text-3xl font-black neon-text" style={{ color: '#00ff88' }}>
              Quick Race
            </h1>

            {/* Searching animation */}
            <motion.div
              className="flex flex-col items-center gap-4 p-8 rounded-2xl"
              style={{ background: 'rgba(26, 26, 46, 0.8)', border: '1px solid rgba(0, 255, 136, 0.08)' }}
            >
              {/* Spinning ring */}
              <motion.div
                className="w-16 h-16 rounded-full"
                style={{ border: '3px solid rgba(0, 255, 136, 0.1)', borderTopColor: '#00ff88' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-white font-medium">
                {phase === 'connecting' ? 'Connecting...' : 'Searching for opponent...'}
              </p>
              {queuePosition > 0 && (
                <p className="text-[#555] text-xs">Queue position: #{queuePosition}</p>
              )}

              {/* Pulsing dots */}
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: '#00ff88' }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>

            <Link
              href="/"
              className="text-sm px-4 py-2 rounded-lg transition-colors"
              style={{ color: '#666' }}
            >
              Cancel
            </Link>
          </motion.div>
        )}

        {/* ─── MATCHED PHASE ─────────────────────────────────── */}
        {phase === 'matched' && opponent && (
          <motion.div
            key="matched"
            className="flex flex-col items-center gap-6 z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.p
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: '#00ff88' }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Match Found
            </motion.p>

            <div className="flex items-center gap-6">
              {/* Me */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-[#1a1a2e] flex items-center justify-center text-2xl">
                  🐱
                </div>
                <span className="text-white text-sm font-medium">{myName}</span>
                <span className="text-[#555] text-xs">{myElo}</span>
              </div>

              <motion.span
                className="text-2xl font-black"
                style={{ color: '#333' }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                VS
              </motion.span>

              {/* Opponent */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-[#1a1a2e] flex items-center justify-center text-2xl">
                  😺
                </div>
                <span className="text-white text-sm font-medium">{opponent.name}</span>
                <span className="text-[#555] text-xs">{opponent.elo}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── PLAYING PHASE ─────────────────────────────────── */}
        {(phase === 'playing' || phase === 'countdown') && engine.level && engine.state && (
          <motion.div
            key="playing"
            className="flex flex-col items-center z-10 w-full max-w-4xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between w-full px-2 mb-3">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold neon-text" style={{ color: '#00ff88' }}>
                  Quick Race
                </h1>
                <button
                  onClick={toggleSound}
                  className="text-sm px-1.5 py-0.5 rounded opacity-60 hover:opacity-100 transition-all"
                  style={{ color: '#666' }}
                >
                  {soundEnabled ? '🔊' : '🔇'}
                </button>
              </div>
            </div>

            {/* Game + Opponent layout */}
            <div className="flex items-start gap-4 justify-center w-full">
              {/* My grid */}
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{ opacity: showCountdown ? 0.4 : 1, scale: showCountdown ? 0.97 : 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Grid
                    level={engine.level}
                    path={engine.state.path}
                    collectedSet={engine.state.collectedSet}
                    isTreatActive={engine.isTreatActive}
                    isYarnActive={engine.isYarnActive}
                    onCellMouseDown={(p) => {
                      if (showCountdown) return;
                      engine.setIsDragging(true);
                      handleMove(p);
                    }}
                    onCellMouseEnter={(p) => {
                      if (showCountdown) return;
                      if (engine.isDragging) handleMove(p);
                    }}
                    scale={0.85}
                  />
                </motion.div>

                {/* Timer & Score */}
                <div className="flex items-center gap-3 mt-3">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${engine.timeLeft <= 5 ? 'animate-shake' : ''}`}
                    style={{
                      background: engine.timeLeft <= 5 ? '#2a1a1a' : '#1a1a2e',
                      border: `1px solid ${engine.timeLeft <= 5 ? 'rgba(255,68,68,0.2)' : 'rgba(0,255,136,0.08)'}`,
                    }}
                  >
                    <span style={{ color: engine.timeLeft <= 5 ? '#ff4444' : '#00ff88' }} className="text-xs">⏱</span>
                    <span
                      className="font-mono font-bold text-sm tabular-nums"
                      style={{ color: engine.timeLeft <= 5 ? '#ff4444' : '#fff' }}
                    >
                      {Math.floor(engine.timeLeft / 60)}:{(engine.timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: '#1a1a2e', border: '1px solid rgba(0,255,136,0.08)' }}
                  >
                    <motion.span
                      className="font-mono font-bold text-sm text-white tabular-nums"
                      key={scoreKey}
                      initial={{ scale: 1.3, color: '#00ff88' }}
                      animate={{ scale: 1, color: '#ffffff' }}
                      transition={{ duration: 0.3 }}
                    >
                      {engine.state.score.toLocaleString()}
                    </motion.span>
                    <span className="text-[#666] text-xs">pts</span>
                  </div>
                </div>
              </div>

              {/* Opponent minimap */}
              {opponent && (
                <div className="hidden sm:block">
                  <OpponentMinimap
                    opponentName={opponent.name}
                    opponentElo={opponent.elo}
                    opponentTier={opponent.tier}
                    opponentPath={opponentPath}
                    opponentProgress={opponentProgress}
                    opponentScore={opponentScore}
                    opponentFinished={opponentFinished}
                    gridWidth={engine.level.width}
                    gridHeight={engine.level.height}
                  />
                </div>
              )}
            </div>

            {/* Disconnect warning */}
            <AnimatePresence>
              {disconnectTimer > 0 && (
                <motion.div
                  className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'rgba(255, 170, 0, 0.1)', color: '#ffaa00', border: '1px solid rgba(255, 170, 0, 0.2)' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  Opponent disconnected — auto-win in {disconnectTimer}s
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ─── FINISHED PHASE ─────────────────────────────────── */}
        {phase === 'finished' && matchResult && (
          <motion.div
            key="result"
            className="flex flex-col items-center gap-6 p-8 sm:p-10 rounded-2xl z-10"
            style={{
              background: 'rgba(26, 26, 46, 0.95)',
              border: `1px solid ${matchResult.eloChange > 0 ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,68,0.2)'}`,
              boxShadow: matchResult.eloChange > 0
                ? '0 0 60px rgba(0,255,136,0.1)'
                : '0 0 40px rgba(255,68,68,0.1)',
            }}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Win/Lose */}
            <motion.h2
              className={`text-5xl font-black ${matchResult.eloChange > 0 ? 'neon-text-strong' : 'neon-text-danger'}`}
              style={{ color: matchResult.eloChange > 0 ? '#00ff88' : '#ff4444' }}
              animate={
                matchResult.eloChange > 0
                  ? { scale: [1, 1.15, 1], rotate: [0, -2, 2, 0] }
                  : { x: [-4, 4, -4, 2, -1, 0] }
              }
              transition={{ duration: 0.6 }}
            >
              {matchResult.eloChange > 0 ? 'Victory!' : 'Defeat'}
            </motion.h2>

            {/* Scores comparison */}
            <div className="flex items-end gap-8">
              <div className="flex flex-col items-center">
                <span className="text-[#888] text-xs mb-1">You</span>
                <motion.span
                  className="text-4xl font-black text-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.3 }}
                >
                  {matchResult.myScore.toLocaleString()}
                </motion.span>
              </div>
              <span className="text-[#333] text-xl font-bold mb-2">vs</span>
              <div className="flex flex-col items-center">
                <span className="text-[#888] text-xs mb-1">{matchResult.opName}</span>
                <motion.span
                  className="text-4xl font-black"
                  style={{ color: '#888' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.5 }}
                >
                  {matchResult.opScore.toLocaleString()}
                </motion.span>
              </div>
            </div>

            {/* ELO Change */}
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: matchResult.eloChange > 0 ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,68,0.08)',
                border: `1px solid ${matchResult.eloChange > 0 ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,68,0.15)'}`,
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <span className="text-sm" style={{ color: '#888' }}>ELO</span>
              <motion.span
                className="font-mono font-bold text-lg"
                style={{ color: matchResult.eloChange > 0 ? '#00ff88' : '#ff4444' }}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 1] }}
                transition={{ delay: 0.9, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {matchResult.eloChange > 0 ? '+' : ''}{matchResult.eloChange}
              </motion.span>
              <span className="text-sm" style={{ color: '#888' }}>→ {matchResult.myElo}</span>
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded ml-1"
                style={{
                  background: 'rgba(0,255,136,0.1)',
                  color: '#00ff88',
                }}
              >
                {matchResult.myTier}
              </span>
            </motion.div>

            {/* Actions */}
            <motion.div
              className="flex gap-3 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <Link
                href="/play/race"
                className="px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: 'rgba(0,255,136,0.1)',
                  color: '#00ff88',
                  border: '1px solid rgba(0,255,136,0.15)',
                }}
              >
                Play Again
              </Link>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{ color: '#666', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                Menu
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
