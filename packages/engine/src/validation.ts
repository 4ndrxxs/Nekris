import { TimedMove } from './types.js';
import { createPRNG } from './prng.js';
import { generateLevel } from './levelGenerator.js';
import { processMove, createInitialState } from './gameEngine.js';

export function replayMoves(
  seed: number,
  levelIndex: number,
  moves: TimedMove[],
): { valid: boolean; finalScore: number } {
  const rng = createPRNG(seed);
  const level = generateLevel(levelIndex, rng);
  let state = createInitialState(level);

  for (const move of moves) {
    if (
      move.point.x < 0 || move.point.x >= level.width ||
      move.point.y < 0 || move.point.y >= level.height
    ) {
      return { valid: false, finalScore: state.score };
    }

    const result = processMove(state, move.point, level);
    if (!result.valid) {
      return { valid: false, finalScore: state.score };
    }
    state = result.state;
  }

  return { valid: true, finalScore: state.score };
}
