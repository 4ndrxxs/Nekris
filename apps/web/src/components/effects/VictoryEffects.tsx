'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface VictoryEffectsProps {
  show: boolean;
  type: 'win' | 'lose';
}

const CONFETTI_COUNT = 50;
const COLORS_WIN = ['#00ff88', '#00ddff', '#ffdd00', '#ff6688', '#aa88ff'];
const COLORS_LOSE = ['#ff4444', '#ff666633', '#44444466'];

export default function VictoryEffects({ show, type }: VictoryEffectsProps) {
  const confetti = useMemo(() => {
    const colors = type === 'win' ? COLORS_WIN : COLORS_LOSE;
    const count = type === 'win' ? CONFETTI_COUNT : 15;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.6,
      rotation: Math.random() * 720 - 360,
      scale: Math.random() * 0.6 + 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 2 + 2,
      wobble: (Math.random() - 0.5) * 100,
    }));
  }, [type]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {/* Confetti pieces */}
      {confetti.map(c => (
        <motion.div
          key={c.id}
          className="absolute rounded-sm"
          style={{
            left: `${c.x}%`,
            top: '-5%',
            width: type === 'win' ? 10 : 6,
            height: type === 'win' ? 14 : 8,
            backgroundColor: c.color,
            transformOrigin: 'center',
          }}
          initial={{ y: '-10vh', x: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: '110vh',
            x: c.wobble,
            rotate: c.rotation,
            opacity: [1, 1, 1, 0],
          }}
          transition={{
            duration: c.duration,
            delay: c.delay,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        />
      ))}

      {/* Central flash burst for win */}
      {type === 'win' && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div
            className="w-[300px] h-[300px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0,255,136,0.3) 0%, transparent 70%)',
            }}
          />
        </motion.div>
      )}

      {/* Expanding shock ring for win */}
      {type === 'win' && (
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ borderColor: '#00ff8866' }}
          initial={{ width: 0, height: 0, opacity: 1 }}
          animate={{ width: 600, height: 600, opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}
