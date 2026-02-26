'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import BackgroundParticles from '@/components/effects/BackgroundParticles';
import UserMenu from '@/components/auth/UserMenu';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-4 relative overflow-hidden">
      <BackgroundParticles />

      {/* Auth */}
      <div className="absolute top-4 right-4 z-20">
        <UserMenu />
      </div>

      {/* Logo */}
      <motion.div
        className="text-center z-10"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.h1
          className="text-7xl font-black tracking-tight neon-text-strong animate-glitch"
          style={{ color: '#00ff88' }}
          animate={{ scale: [1, 1.01, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          NEKRIS
        </motion.h1>
        <motion.p
          className="text-[#666] text-lg mt-2 tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Competitive Puzzle
        </motion.p>
      </motion.div>

      {/* Menu */}
      <motion.div
        className="flex flex-col gap-4 w-full max-w-xs z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link href="/play/daily">
          <motion.div
            className="flex items-center justify-center px-6 py-4 rounded-xl font-bold text-lg cursor-pointer relative overflow-hidden"
            style={{
              background: 'rgba(26, 26, 46, 0.8)',
              color: '#00ff88',
              border: '1px solid rgba(0, 255, 136, 0.15)',
            }}
            whileHover={{
              scale: 1.04,
              boxShadow: '0 0 30px rgba(0, 255, 136, 0.15), inset 0 0 30px rgba(0, 255, 136, 0.05)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <span className="relative z-10">Daily Challenge</span>
            <motion.div
              className="absolute inset-0 opacity-0"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.05), transparent)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        </Link>

        <Link href="/leaderboard">
          <motion.div
            className="flex items-center justify-center px-6 py-4 rounded-xl font-bold text-lg cursor-pointer"
            style={{
              background: 'rgba(26, 26, 46, 0.6)',
              color: '#e0e0e0',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
            whileHover={{ scale: 1.04, borderColor: 'rgba(0, 255, 136, 0.15)' }}
            whileTap={{ scale: 0.97 }}
          >
            Leaderboard
          </motion.div>
        </Link>

        <Link href="/play/race">
          <motion.div
            className="flex items-center justify-center px-6 py-4 rounded-xl font-bold text-lg cursor-pointer relative overflow-hidden"
            style={{
              background: 'rgba(26, 26, 46, 0.7)',
              color: '#00ddff',
              border: '1px solid rgba(0, 221, 255, 0.12)',
            }}
            whileHover={{
              scale: 1.04,
              boxShadow: '0 0 30px rgba(0, 221, 255, 0.12), inset 0 0 30px rgba(0, 221, 255, 0.04)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <span className="relative z-10">Quick Race</span>
            <motion.div
              className="absolute inset-0 opacity-0"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,221,255,0.04), transparent)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1.5 }}
            />
          </motion.div>
        </Link>
      </motion.div>

      <motion.p
        className="absolute bottom-6 text-xs z-10"
        style={{ color: '#333' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        nekris.online
      </motion.p>
    </div>
  );
}
