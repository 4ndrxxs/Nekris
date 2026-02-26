'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { CellType } from '@nekris/engine';
import CatHead from './CatHead';

interface CellProps {
  type: CellType;
  isInPath: boolean;
  isHead: boolean;
  isTail: boolean;
  isCollected: boolean;
  connections: { up: boolean; down: boolean; left: boolean; right: boolean };
  headDirection: 'up' | 'down' | 'left' | 'right';
  pathIndex: number;
  onMouseDown: () => void;
  onMouseEnter: () => void;
  isWarning?: boolean;
  gridEntranceDelay?: number;
}

const OBSTACLE_STYLES: Record<number, { bg: string; icon: string; className?: string }> = {
  [CellType.WATER]: { bg: '#0a1628', icon: '💧', className: 'animate-water-ripple' },
  [CellType.COUCH]: { bg: '#2a1a1a', icon: '🛋️' },
  [CellType.PLANT]: { bg: '#0f2010', icon: '🌿' },
  [CellType.BOX]: { bg: '#1a1a2e', icon: '📦' },
};

function CellComponent({
  type, isInPath, isHead, isTail, isCollected,
  connections, headDirection, pathIndex, onMouseDown, onMouseEnter,
  isWarning, gridEntranceDelay = 0,
}: CellProps) {
  const obstacle = OBSTACLE_STYLES[type];
  const isObstacle = !!obstacle;
  const isEmpty = type === CellType.EMPTY || type === CellType.START;

  const bgColor = isInPath
    ? '#00ff88'
    : isObstacle
      ? obstacle.bg
      : '#1e1e3a';

  const pathGlow = isInPath
    ? `inset 0 0 8px rgba(0, 255, 136, 0.4), 0 0 ${isHead ? 16 : 8}px rgba(0, 255, 136, ${isHead ? 0.5 : 0.25})`
    : 'none';

  return (
    <motion.div
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      className={`relative w-full h-full flex items-center justify-center rounded-[10%] cursor-pointer overflow-hidden ${
        isObstacle && !isInPath ? (obstacle.className ?? '') : ''
      }`}
      style={{
        backgroundColor: isObstacle && obstacle.className ? undefined : bgColor,
        boxShadow: pathGlow,
      }}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={
        isInPath
          ? { opacity: 1, scale: [0.75, 1.1, 0.97, 1] }
          : { opacity: 1, scale: 1 }
      }
      transition={
        isInPath
          ? { duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }
          : { duration: 0.3, delay: gridEntranceDelay, ease: 'easeOut' }
      }
      whileHover={!isInPath && isEmpty ? { scale: 1.08, backgroundColor: '#2a2a4a' } : undefined}
    >
      {/* Obstacle icon (subtle) */}
      {isObstacle && !isInPath && (
        <span className="text-[9px] opacity-30 select-none pointer-events-none">{obstacle.icon}</span>
      )}

      {/* Collectible: TREAT (fish) */}
      {!isCollected && type === CellType.TREAT && (
        <motion.div
          className={`text-lg z-10 select-none ${isWarning ? 'animate-warning-flash' : 'animate-collectible-bob'}`}
          style={{ filter: isWarning ? 'saturate(0.5)' : 'drop-shadow(0 0 4px rgba(255, 170, 0, 0.5))' }}
        >
          🐟
        </motion.div>
      )}

      {/* Collectible: YARN */}
      {!isCollected && type === CellType.YARN && (
        <motion.div
          className={`text-lg z-10 select-none ${isWarning ? 'animate-warning-flash' : 'animate-collectible-bob'}`}
          style={{
            filter: isWarning ? 'saturate(0.5)' : 'drop-shadow(0 0 4px rgba(170, 136, 255, 0.5))',
            animationDelay: '0.3s',
          }}
        >
          🧶
        </motion.div>
      )}

      {/* Goal: SAUCER */}
      {type === CellType.SAUCER && !isInPath && (
        <motion.div
          className="text-lg z-10 select-none"
          animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(255, 221, 0, 0.5))' }}
        >
          🏁
        </motion.div>
      )}

      {/* Path connectors + cat head */}
      {isInPath && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Junction dot for non-head, non-tail path cells */}
          {!isHead && !isTail && (
            <div
              className="w-[55%] h-[55%] z-20 rounded-full"
              style={{
                backgroundColor: '#00ff88',
                boxShadow: '0 0 8px rgba(0, 255, 136, 0.6)',
              }}
            />
          )}

          {/* Directional connectors */}
          {connections.up && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] h-[100%] z-10"
              style={{ backgroundColor: '#00ff88' }}
            />
          )}
          {connections.down && (
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[55%] h-[100%] z-10"
              style={{ backgroundColor: '#00ff88' }}
            />
          )}
          {connections.left && (
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-[55%] w-[100%] z-10"
              style={{ backgroundColor: '#00ff88' }}
            />
          )}
          {connections.right && (
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-[55%] w-[100%] z-10"
              style={{ backgroundColor: '#00ff88' }}
            />
          )}

          {/* Cat head at path end */}
          {isHead && <CatHead direction={headDirection} />}

          {/* Tail glow ring */}
          {isTail && (
            <motion.div
              className="absolute w-[55%] h-[55%] z-30 rounded-full"
              style={{
                backgroundColor: '#00ff88',
                boxShadow: '0 0 12px rgba(0, 255, 136, 0.6), 0 0 24px rgba(0, 255, 136, 0.3)',
              }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
      )}
    </motion.div>
  );
}

export default memo(CellComponent);
