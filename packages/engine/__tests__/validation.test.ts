import { describe, it, expect } from 'vitest';
import { replayMoves } from '../src/validation.js';
import { generateLevel } from '../src/levelGenerator.js';
import { createPRNG } from '../src/prng.js';
import { processMove, createInitialState } from '../src/gameEngine.js';

describe('replayMoves', () => {
  it('replays valid moves and returns correct final score', () => {
    const seed = 42;
    const levelIndex = 1;
    const rng = createPRNG(seed);
    const level = generateLevel(levelIndex, rng);

    let state = createInitialState(level);
    const moves = level.path.slice(1).map((p, i) => ({ point: p, t: (i + 1) * 100 }));

    for (const move of moves) {
      const result = processMove(state, move.point, level);
      if (result.valid) state = result.state;
    }

    const replay = replayMoves(seed, levelIndex, moves);
    expect(replay.valid).toBe(true);
    expect(replay.finalScore).toBe(state.score);
  });

  it('detects invalid moves', () => {
    const seed = 42;
    const levelIndex = 1;
    const moves = [{ point: { x: 99, y: 99 }, t: 100 }];
    const replay = replayMoves(seed, levelIndex, moves);
    expect(replay.valid).toBe(false);
  });

  it('is deterministic', () => {
    const seed = 12345;
    const levelIndex = 3;
    const rng = createPRNG(seed);
    const level = generateLevel(levelIndex, rng);
    const moves = level.path.slice(1, 4).map((p, i) => ({ point: p, t: (i + 1) * 100 }));

    const r1 = replayMoves(seed, levelIndex, moves);
    const r2 = replayMoves(seed, levelIndex, moves);
    expect(r1).toEqual(r2);
  });
});
