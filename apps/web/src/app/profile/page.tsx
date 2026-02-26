'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import BackgroundParticles from '@/components/effects/BackgroundParticles';
import { getSupabaseClient } from '@/lib/supabase';
import { Tier, getTier } from '@nekris/engine';

interface MatchRecord {
  id: string;
  winner_id: string;
  player_a_id: string;
  player_b_id: string;
  score_a: number;
  score_b: number;
  elo_change: number;
  created_at: string;
}

const TIER_CONFIG: Record<string, { color: string; gradient: string; icon: string }> = {
  [Tier.BRONZE]: { color: '#cd7f32', gradient: 'from-amber-900 to-amber-700', icon: '🥉' },
  [Tier.SILVER]: { color: '#c0c0c0', gradient: 'from-gray-400 to-gray-300', icon: '🥈' },
  [Tier.GOLD]: { color: '#ffd700', gradient: 'from-yellow-600 to-yellow-400', icon: '🥇' },
  [Tier.PLATINUM]: { color: '#00ddff', gradient: 'from-cyan-600 to-cyan-400', icon: '💎' },
  [Tier.DIAMOND]: { color: '#b9f2ff', gradient: 'from-sky-300 to-blue-200', icon: '💠' },
  [Tier.MASTER]: { color: '#ff4444', gradient: 'from-red-600 to-red-400', icon: '👑' },
};

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [stats, setStats] = useState({ wins: 0, losses: 0, streak: 0 });

  const elo = profile?.elo ?? 1000;
  const tier = getTier(elo);
  const tierConfig = TIER_CONFIG[tier] ?? TIER_CONFIG[Tier.BRONZE];

  // Fetch match history
  useEffect(() => {
    if (!user) {
      setLoadingMatches(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoadingMatches(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setMatches(data as MatchRecord[]);

        // Calculate stats
        let wins = 0;
        let losses = 0;
        let currentStreak = 0;
        let streakCounting = true;

        for (const match of data as MatchRecord[]) {
          const isWinner = match.winner_id === user.id;
          if (isWinner) {
            wins++;
            if (streakCounting) currentStreak++;
          } else {
            losses++;
            if (streakCounting) streakCounting = false;
          }
        }

        setStats({ wins, losses, streak: currentStreak });
      }

      setLoadingMatches(false);
    })();
  }, [user]);

  // ELO progress to next tier
  const tierThresholds = [0, 800, 1000, 1200, 1400, 1600, 2000];
  const currentTierIdx = tierThresholds.findIndex(t => elo < t) - 1;
  const nextThreshold = tierThresholds[currentTierIdx + 1] ?? 2000;
  const prevThreshold = tierThresholds[Math.max(0, currentTierIdx)] ?? 0;
  const tierProgress = ((elo - prevThreshold) / (nextThreshold - prevThreshold)) * 100;

  if (loading) return null;

  return (
    <div className="min-h-dvh flex flex-col items-center p-4 sm:p-6 relative overflow-hidden">
      <BackgroundParticles />

      {/* Header */}
      <motion.div
        className="flex items-center justify-between w-full max-w-lg mb-8 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link
          href="/"
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: '#666', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          ← Menu
        </Link>
        <h1 className="text-xl font-bold neon-text" style={{ color: '#00ff88' }}>
          Profile
        </h1>
        <div className="w-16" /> {/* Spacer */}
      </motion.div>

      {!user ? (
        <motion.div
          className="flex flex-col items-center gap-4 z-10 p-8 rounded-2xl"
          style={{ background: 'rgba(26, 26, 46, 0.9)', border: '1px solid rgba(255,255,255,0.05)' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-white text-lg">Sign in to view your profile</p>
          <p className="text-[#555] text-sm">Track your ELO, tier, and match history.</p>
          <Link
            href="/"
            className="mt-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.15)' }}
          >
            Go to Menu
          </Link>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center gap-6 w-full max-w-lg z-10">
          {/* Player Card */}
          <motion.div
            className="w-full p-6 rounded-2xl flex flex-col items-center gap-4"
            style={{
              background: 'rgba(26, 26, 46, 0.9)',
              border: `1px solid ${tierConfig.color}22`,
              boxShadow: `0 0 40px ${tierConfig.color}10`,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Avatar + Name */}
            <div className="flex flex-col items-center gap-2">
              <motion.div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{ background: `${tierConfig.color}15`, border: `2px solid ${tierConfig.color}33` }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                {tierConfig.icon}
              </motion.div>
              <h2 className="text-xl font-bold text-white">
                {profile?.display_name || user.email?.split('@')[0] || 'Player'}
              </h2>
            </div>

            {/* Tier Badge */}
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: `${tierConfig.color}15`,
                border: `1px solid ${tierConfig.color}33`,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.15, 1] }}
              transition={{ delay: 0.3, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <span className="text-2xl font-black" style={{ color: tierConfig.color }}>
                {tier}
              </span>
            </motion.div>

            {/* ELO Display */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span className="text-5xl font-black text-white tabular-nums">{elo}</span>
              <p className="text-[#666] text-xs mt-1">Rating</p>
            </motion.div>

            {/* Tier progress bar */}
            <div className="w-full px-4">
              <div className="flex justify-between text-xs mb-1" style={{ color: '#555' }}>
                <span>{prevThreshold}</span>
                <span>{nextThreshold}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#1a1a2e' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${tierConfig.color}88, ${tierConfig.color})`,
                    boxShadow: `0 0 8px ${tierConfig.color}44`,
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(tierProgress, 100)}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            className="grid grid-cols-3 gap-3 w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {[
              { label: 'Wins', value: stats.wins, color: '#00ff88' },
              { label: 'Losses', value: stats.losses, color: '#ff4444' },
              { label: 'Streak', value: `${stats.streak}🔥`, color: '#ffaa00' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex flex-col items-center p-3 rounded-xl"
                style={{ background: 'rgba(26, 26, 46, 0.8)', border: '1px solid rgba(255,255,255,0.03)' }}
              >
                <span className="text-2xl font-black tabular-nums" style={{ color: stat.color }}>
                  {stat.value}
                </span>
                <span className="text-[#555] text-xs mt-0.5">{stat.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Match History */}
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h3 className="text-sm font-bold text-[#888] mb-3 tracking-wide uppercase">
              Recent Matches
            </h3>

            {loadingMatches ? (
              <div className="flex justify-center py-8">
                <motion.div
                  className="w-6 h-6 rounded-full"
                  style={{ border: '2px solid rgba(0,255,136,0.1)', borderTopColor: '#00ff88' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            ) : matches.length === 0 ? (
              <div
                className="text-center py-8 rounded-xl"
                style={{ background: 'rgba(26, 26, 46, 0.6)', border: '1px solid rgba(255,255,255,0.03)' }}
              >
                <p className="text-[#555] text-sm">No matches yet.</p>
                <Link
                  href="/play/race"
                  className="inline-block mt-3 text-xs font-medium"
                  style={{ color: '#00ff88' }}
                >
                  Play Quick Race →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <AnimatePresence>
                  {matches.map((match, i) => {
                    const isPlayerA = match.player_a_id === user.id;
                    const isWinner = match.winner_id === user.id;
                    const myScore = isPlayerA ? match.score_a : match.score_b;
                    const opScore = isPlayerA ? match.score_b : match.score_a;
                    const eloChange = isPlayerA ? match.elo_change : -match.elo_change;
                    const date = new Date(match.created_at);

                    return (
                      <motion.div
                        key={match.id}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{
                          background: 'rgba(26, 26, 46, 0.7)',
                          borderLeft: `3px solid ${isWinner ? '#00ff88' : '#ff4444'}`,
                        }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{
                              background: isWinner ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
                              color: isWinner ? '#00ff88' : '#ff4444',
                            }}
                          >
                            {isWinner ? 'W' : 'L'}
                          </span>
                          <div>
                            <span className="text-white text-sm font-medium tabular-nums">
                              {myScore.toLocaleString()} - {opScore.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="text-xs font-mono font-bold"
                            style={{ color: eloChange >= 0 ? '#00ff88' : '#ff4444' }}
                          >
                            {eloChange >= 0 ? '+' : ''}{eloChange}
                          </span>
                          <span className="text-[#444] text-xs">
                            {date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
