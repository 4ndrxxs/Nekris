'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownOverlayProps {
  onComplete: () => void;
  playSound?: (name: string) => void;
}

export default function CountdownOverlay({ onComplete, playSound }: CountdownOverlayProps) {
  const [count, setCount] = useState(3);
  const [done, setDone] = useState(false);

  const handleComplete = useCallback(() => {
    setDone(true);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (done) return;
    if (count === 0) {
      playSound?.('go');
      const timer = setTimeout(handleComplete, 700);
      return () => clearTimeout(timer);
    }
    playSound?.('countdown');
    const timer = setTimeout(() => setCount(c => c - 1), 900);
    return () => clearTimeout(timer);
  }, [count, done, handleComplete, playSound]);

  if (done) return null;

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50"
      initial={{ backgroundColor: 'rgba(10, 10, 10, 0.9)' }}
      animate={{ backgroundColor: count === 0 ? 'rgba(10, 10, 10, 0)' : 'rgba(10, 10, 10, 0.7)' }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 3, opacity: 0, filter: 'blur(12px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          exit={{ scale: 0.3, opacity: 0, filter: 'blur(8px)' }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="text-8xl font-black select-none"
          style={{
            color: count === 0 ? '#00ff88' : '#ffffff',
            textShadow: count === 0
              ? '0 0 40px #00ff88, 0 0 80px #00ff8855, 0 0 120px #00ff8833'
              : '0 0 20px rgba(255,255,255,0.4)',
          }}
        >
          {count === 0 ? 'GO!' : count}
        </motion.div>
      </AnimatePresence>

      {/* Expanding ring pulse */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            key={`ring-${count}`}
            className="absolute rounded-full border-2"
            style={{ borderColor: '#00ff8844' }}
            initial={{ width: 0, height: 0, opacity: 0.8 }}
            animate={{ width: 300, height: 300, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
