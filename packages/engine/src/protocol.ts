import { Point } from './types.js';

// Client -> Server
export type ClientMsg =
  | { type: 'QUEUE_JOIN'; mode: 'quick' | 'ranked'; token: string }
  | { type: 'QUEUE_LEAVE' }
  | { type: 'READY' }
  | { type: 'MOVE'; point: Point; t: number }
  | { type: 'FINISH'; moves: { point: Point; t: number }[]; finalScore: number };

// Server -> Client
export type ServerMsg =
  | { type: 'QUEUE_STATUS'; position: number }
  | { type: 'MATCH_FOUND'; roomId: string; opponent: { name: string; elo: number; tier: string } }
  | { type: 'GAME_INIT'; seed: number; levelIndex: number; startsAt: number }
  | { type: 'COUNTDOWN'; seconds: number }
  | { type: 'GAME_START' }
  | { type: 'OPPONENT_MOVE'; point: Point; t: number; score: number; progress: number }
  | { type: 'OPPONENT_FINISH'; score: number; time: number }
  | { type: 'MATCH_RESULT'; winner: string; myElo: number; eloChange: number; opScore: number }
  | { type: 'OPPONENT_DISCONNECT'; timeout: number }
  | { type: 'ERROR'; message: string };
