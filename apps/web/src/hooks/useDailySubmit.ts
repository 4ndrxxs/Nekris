'use client';

import { useCallback, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/database.types';

type DailyRunInsert = Database['public']['Tables']['daily_runs']['Insert'];

interface SubmitPayload {
  seed: number;
  score: number;
  timeLeftMs: number;
  moveCount: number;
  moves: { point: { x: number; y: number }; t: number }[];
}

export function useDailySubmit() {
  const { user, isAvailable } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitScore = useCallback(async (payload: SubmitPayload) => {
    const client = getSupabaseClient();
    if (!client || !user || !isAvailable) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const row: DailyRunInsert = {
        user_id: user.id,
        seed: payload.seed,
        score: payload.score,
        time_left_ms: payload.timeLeftMs,
        move_count: payload.moveCount,
        moves: payload.moves,
      };

      const { error: err } = await client
        .from('daily_runs')
        .upsert(row as never, { onConflict: 'user_id,date' });

      if (err) throw err;
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }, [user, isAvailable]);

  return { submitScore, submitting, submitted, error };
}
