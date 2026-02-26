export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          elo: number;
          tier: string;
          wins: number;
          losses: number;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          elo?: number;
          tier?: string;
          wins?: number;
          losses?: number;
          avatar_url?: string | null;
        };
        Update: {
          display_name?: string;
          elo?: number;
          tier?: string;
          wins?: number;
          losses?: number;
          avatar_url?: string | null;
        };
      };
      daily_seeds: {
        Row: {
          date: string;
          seed: number;
          created_at: string;
        };
        Insert: {
          date?: string;
          seed: number;
        };
        Update: {
          seed?: number;
        };
      };
      daily_runs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          seed: number;
          score: number;
          time_left_ms: number;
          move_count: number;
          moves: unknown;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          date?: string;
          seed: number;
          score: number;
          time_left_ms?: number;
          move_count?: number;
          moves?: unknown;
        };
        Update: {
          score?: number;
          verified?: boolean;
        };
      };
      matches: {
        Row: {
          id: string;
          seed: number;
          level_index: number;
          player_a: string;
          player_b: string;
          winner_id: string | null;
          score_a: number | null;
          score_b: number | null;
          elo_change: number;
          status: 'pending' | 'active' | 'completed' | 'abandoned';
          created_at: string;
          finished_at: string | null;
        };
        Insert: {
          seed: number;
          level_index?: number;
          player_a: string;
          player_b: string;
        };
        Update: {
          winner_id?: string;
          score_a?: number;
          score_b?: number;
          elo_change?: number;
          status?: 'pending' | 'active' | 'completed' | 'abandoned';
          finished_at?: string;
        };
      };
    };
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type DailyRun = Database['public']['Tables']['daily_runs']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type DailySeed = Database['public']['Tables']['daily_seeds']['Row'];
