'use client';

import { motion } from 'framer-motion';

interface CatHeadProps {
  direction: 'up' | 'down' | 'left' | 'right';
}

const rotations = { up: 0, right: 90, down: 180, left: 270 };

export default function CatHead({ direction }: CatHeadProps) {
  return (
    <motion.div
      className="absolute w-[75%] h-[75%] z-40 flex items-center justify-center pointer-events-none"
      animate={{
        rotate: rotations[direction],
        scale: [0.85, 1.12, 0.95, 1],
      }}
      transition={{
        rotate: { duration: 0.15, ease: 'easeOut' },
        scale: { duration: 0.25, ease: [0.34, 1.56, 0.64, 1] },
      }}
      style={{ filter: 'drop-shadow(0 0 6px rgba(0, 255, 136, 0.4))' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 80 92" width="100%" height="100%">
        {/* Body */}
        <rect width="80" height="80" y="12" fill="#00ff88" rx="20" />
        {/* Ears */}
        <path
          fill="#00ff88"
          d="M18.268 3c.77-1.333 2.694-1.333 3.464 0l9.526 16.5c.77 1.333-.192 3-1.732 3H10.474c-1.54 0-2.502-1.667-1.732-3L18.268 3ZM58.268 3c.77-1.333 2.694-1.333 3.464 0l9.526 16.5c.77 1.333-.192 3-1.732 3H50.474c-1.54 0-2.502-1.667-1.732-3L58.268 3Z"
        />
        {/* Eyes (with blink animation via CSS) */}
        <motion.g
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 2, times: [0, 0.45, 0.5, 0.55, 1] }}
          style={{ transformOrigin: '40px 42px' }}
        >
          <path stroke="#0a0a0a" strokeLinecap="round" strokeWidth="2.5" d="M32 42.5a6.5 6.5 0 1 0-13 0" />
          <path stroke="#0a0a0a" strokeLinecap="round" strokeWidth="2.5" d="M60 42.5a6.5 6.5 0 1 0-13 0" />
        </motion.g>
        {/* Mouth */}
        <path stroke="#0a0a0a" strokeLinecap="round" strokeWidth="2" d="M23 66.143a8.357 8.357 0 1 0 16.714 0M39.714 66.143a8.357 8.357 0 0 0 16.715 0" />
        {/* Nose */}
        <path fill="#0a0a0a" d="M40.544 66.197a1 1 0 0 1-1.659 0l-5.914-8.781a1 1 0 0 1 .829-1.559h11.83a1 1 0 0 1 .83 1.559l-5.916 8.781Z" />
      </svg>
    </motion.div>
  );
}
