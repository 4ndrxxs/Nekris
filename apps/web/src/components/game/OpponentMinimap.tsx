'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Point } from '@nekris/engine';

interface OpponentMinimapProps {
  opponentName: string;
  opponentElo: number;
  opponentTier: string;
  opponentPath: Point[];
  opponentProgress: number; // 0-1
  opponentScore: number;
  opponentFinished: boolean;
  gridWidth: number;
  gridHeight: number;
}

const TIER_COLORS: Record<string, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Platinum: '#00ddff',
  Diamond: '#b9f2ff',
  Master: '#ff4444',
};

export default function OpponentMinimap({
  opponentName, opponentElo, opponentTier, opponentPath,
  opponentProgress, opponentScore, opponentFinished,
  gridWidth, gridHeight,
}: OpponentMinimapProps) {
  const cellSize = 4;
  const gap = 1;
  const mapWidth = gridWidth * (cellSize + gap);
  const mapHeight = gridHeight * (cellSize + gap);
  const tierColor = TIER_COLORS[opponentTier] ?? '#666';

  return (
    <motion.div
      className="flex flex-col items-center gap-2 p-3 rounded-xl"
      style={{
        background: 'rgba(26, 26, 46, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Opponent info */}
      <div className="flex items-center gap-2 text-xs">
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
          style={{ background: `${tierColor}22`, color: tierColor, border: `1px solid ${tierColor}33` }}
        >
          {opponentTier}
        </span>
        <span className="text-white font-medium truncate max-w-[80px]">{opponentName}</span>
        <span className="text-[#555]">{opponentElo}</span>
      </div>

      {/* Mini grid */}
      <div
        className="relative"
        style={{ width: mapWidth, height: mapHeight }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 rounded"
          style={{ background: 'rgba(10, 10, 10, 0.6)' }}
        />

        {/* Opponent path dots */}
        <svg
          width={mapWidth}
          height={mapHeight}
          className="absolute inset-0"
        >
          {opponentPath.map((point, i) => {
            const isHead = i === opponentPath.length - 1;
            return (
              <rect
                key={`${point.x}-${point.y}-${i}`}
                x={point.x * (cellSize + gap)}
                y={point.y * (cellSize + gap)}
                width={cellSize}
                height={cellSize}
                rx={isHead ? cellSize / 2 : 1}
                fill={isHead ? '#ff6b6b' : '#ff6b6b88'}
              />
            );
          })}
        </svg>

        {/* Finished overlay */}
        <AnimatePresence>
          {opponentFinished && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center rounded"
              style={{ background: 'rgba(255, 68, 68, 0.15)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="text-[10px] font-bold" style={{ color: '#ff6b6b' }}>
                DONE
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#1a1a2e' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: '#ff6b6b', boxShadow: '0 0 4px rgba(255, 107, 107, 0.4)' }}
          animate={{ width: `${opponentProgress * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Score */}
      <motion.span
        className="text-xs font-mono font-bold tabular-nums"
        style={{ color: '#ff6b6b' }}
        key={opponentScore}
        animate={{ scale: [1.2, 1] }}
        transition={{ duration: 0.2 }}
      >
        {opponentScore.toLocaleString()} pts
      </motion.span>
    </motion.div>
  );
}
