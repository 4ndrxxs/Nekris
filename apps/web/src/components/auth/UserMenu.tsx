'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTier } from '@nekris/engine';

export default function UserMenu() {
  const { user, profile, loading, signInWithGoogle, signInAnonymously, signOut, isAvailable } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  if (!isAvailable) return null;
  if (loading) return <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: '#1a1a2e' }} />;

  if (!user) {
    return (
      <div className="flex gap-2">
        <motion.button
          onClick={signInWithGoogle}
          className="px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ background: '#1a1a2e', color: '#00ff88', border: '1px solid rgba(0,255,136,0.15)' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Sign in
        </motion.button>
        <motion.button
          onClick={signInAnonymously}
          className="px-3 py-1.5 rounded-lg text-sm"
          style={{ color: '#666' }}
          whileHover={{ scale: 1.05, color: '#888' }}
          whileTap={{ scale: 0.95 }}
        >
          Guest
        </motion.button>
      </div>
    );
  }

  const tier = profile ? getTier(profile.elo) : null;

  return (
    <div className="relative">
      <motion.button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{ background: '#1a1a2e', border: '1px solid rgba(0,255,136,0.08)' }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: '#00ff8833', color: '#00ff88' }}>
            {(profile?.display_name || 'P')[0].toUpperCase()}
          </div>
        )}
        <span className="text-sm text-white">{profile?.display_name || 'Player'}</span>
        {tier && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#00ff8822', color: '#00ff88' }}>
            {tier}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 min-w-[160px] rounded-lg overflow-hidden z-50"
            style={{ background: '#1a1a2e', border: '1px solid rgba(0,255,136,0.1)' }}
          >
            <a href="/profile" className="block px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
              style={{ color: '#e0e0e0' }}>
              Profile
            </a>
            <div className="border-t border-white/5" />
            <button
              onClick={() => { signOut(); setShowMenu(false); }}
              className="block w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
              style={{ color: '#ff4444' }}
            >
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
