'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import BackgroundParticles from '@/components/effects/BackgroundParticles';
import type { DailyRun, Profile } from '@/lib/database.types';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  moveCount: number;
  timeLeftMs: number;
  userId: string;
  avatarUrl: string | null;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const today = new Date();
    setDateStr(today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }));

    const client = supabase();
    if (!client) {
      setLoading(false);
      return;
    }

    const todayISO = today.toISOString().split('T')[0];

    (async () => {
      const { data } = await client
        .from('daily_runs')
        .select(`
          score,
          move_count,
          time_left_ms,
          user_id,
          profiles!inner(display_name, avatar_url)
        `)
        .eq('date', todayISO)
        .order('score', { ascending: false })
        .limit(50);

      if (data) {
        setEntries(data.map((row: any, i: number) => ({
          rank: i + 1,
          displayName: row.profiles?.display_name || 'Player',
          score: row.score,
          moveCount: row.move_count,
          timeLeftMs: row.time_left_ms,
          userId: row.user_id,
          avatarUrl: row.profiles?.avatar_url || null,
        })));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center p-4 relative overflow-hidden">
      <BackgroundParticles />

      {/* Header */}
      <motion.div
        className="text-center mb-6 z-10 mt-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-black neon-text" style={{ color: '#00ff88' }}>
          Daily Leaderboard
        </h1>
        <p className="text-sm mt-1" style={{ color: '#666' }}>{dateStr}</p>
      </motion.div>

      {/* Back button */}
      <Link href="/" className="absolute top-4 left-4 z-10">
        <motion.span
          className="text-sm px-3 py-1.5 rounded-lg"
          style={{ background: '#1a1a2e', color: '#666', border: '1px solid rgba(255,255,255,0.05)' }}
          whileHover={{ scale: 1.05, color: '#00ff88' }}
        >
          &larr; Back
        </motion.span>
      </Link>

      {/* Leaderboard table */}
      <motion.div
        className="w-full max-w-lg z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? (
          <div className="text-center py-12" style={{ color: '#666' }}>
            Loading...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <p style={{ color: '#666' }}>No scores yet today.</p>
            <Link href="/play/daily">
              <motion.span
                className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-bold"
                style={{ background: '#1a1a2e', color: '#00ff88', border: '1px solid rgba(0,255,136,0.15)' }}
                whileHover={{ scale: 1.05 }}
              >
                Be the first!
              </motion.span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {entries.map((entry, i) => {
              const isMe = user?.id === entry.userId;
              const rankColor = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#666';

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg"
                  style={{
                    background: isMe ? 'rgba(0, 255, 136, 0.08)' : 'rgba(26, 26, 46, 0.5)',
                    border: isMe ? '1px solid rgba(0, 255, 136, 0.15)' : '1px solid transparent',
                  }}
                >
                  {/* Rank */}
                  <span className="w-8 text-right font-bold tabular-nums" style={{ color: rankColor }}>
                    {entry.rank}
                  </span>

                  {/* Avatar */}
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: '#1a1a2e', color: '#666' }}>
                      {entry.displayName[0].toUpperCase()}
                    </div>
                  )}

                  {/* Name */}
                  <span className="flex-1 text-sm truncate" style={{ color: isMe ? '#00ff88' : '#e0e0e0' }}>
                    {entry.displayName}
                    {isMe && <span className="ml-1 text-xs opacity-60">(you)</span>}
                  </span>

                  {/* Score */}
                  <span className="font-mono font-bold tabular-nums text-white">
                    {entry.score.toLocaleString()}
                  </span>

                  {/* Moves */}
                  <span className="text-xs tabular-nums" style={{ color: '#555' }}>
                    {entry.moveCount}m
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
