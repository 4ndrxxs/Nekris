import {
  CellType, Point, EngineState, LevelData, MoveResult, GameEffect, MoveOptions,
} from './types';
import { GAME_CONSTANTS } from './constants';

export function createInitialState(level: LevelData): EngineState {
  return {
    path: [level.startPoint],
    score: 0,
    levelScore: 0,
    collectedSet: new Set<string>(),
    isWon: false,
    moveCount: 0,
  };
}

function isAdjacent(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

const OBSTACLE_TYPES: ReadonlySet<CellType> = new Set([
  CellType.COUCH, CellType.PLANT, CellType.BOX,
]);

export function processMove(
  state: EngineState,
  point: Point,
  level: LevelData,
  options: MoveOptions = {},
): MoveResult {
  const {
    isTreatActive = true,
    isYarnActive = true,
    totalLevels = GAME_CONSTANTS.TOTAL_LEVELS,
    currentLevel = 1,
  } = options;

  const effects: GameEffect[] = [];
  const noOp = (valid = false): MoveResult => ({ state, effects: [], valid });

  // Rule 1: Can't move if already won
  if (state.isWon) return noOp();

  // Guard: empty path
  if (state.path.length === 0) return noOp();

  const last = state.path[state.path.length - 1];

  // Rule 3: Must be adjacent
  if (!isAdjacent(last, point)) return noOp();

  // Rule 2: Backspace — click second-to-last
  const secondLast = state.path.length >= 2 ? state.path[state.path.length - 2] : null;
  if (secondLast && point.x === secondLast.x && point.y === secondLast.y) {
    effects.push({ type: 'AUDIO', sound: 'backspace' });
    return {
      state: {
        ...state,
        path: state.path.slice(0, -1),
        score: Math.max(state.levelScore, state.score - GAME_CONSTANTS.BASE_MOVE_SCORE),
        moveCount: state.moveCount + 1,
      },
      effects,
      valid: true,
    };
  }

  // Rule 4: Can't click already-in-path cell
  if (state.path.some((pt) => pt.x === point.x && pt.y === point.y)) return noOp();

  const cellType = level.grid[point.y][point.x];

  // Rule 5: Can't click obstacle
  if (OBSTACLE_TYPES.has(cellType)) return noOp();

  // Rule 6: WATER cell resets
  if (cellType === CellType.WATER) {
    effects.push({ type: 'WATER_RESET', points: [...state.path] });
    return { state, effects, valid: true };
  }

  // Forward move
  const newPath = [...state.path, point];
  const cellKey = `${point.x},${point.y}`;
  let scoreAdd = GAME_CONSTANTS.BASE_MOVE_SCORE;
  const newCollected = new Set(state.collectedSet);

  // Rule 7 & 8: Collectibles
  if (
    (cellType === CellType.TREAT && isTreatActive) ||
    (cellType === CellType.YARN && isYarnActive)
  ) {
    if (!newCollected.has(cellKey)) {
      newCollected.add(cellKey);
      if (cellType === CellType.TREAT) {
        effects.push({ type: 'AUDIO', sound: 'fish' });
        effects.push({ type: 'TIMER_ADD', seconds: GAME_CONSTANTS.TREAT_TIME_BONUS_SECONDS });
      } else {
        effects.push({ type: 'AUDIO', sound: 'yarn' });
        scoreAdd += GAME_CONSTANTS.YARN_SCORE_BONUS;
      }
    } else {
      effects.push({ type: 'AUDIO', sound: 'stretch' });
    }
  } else {
    // Rule 9: Normal step
    effects.push({ type: 'AUDIO', sound: 'stretch' });
  }

  // Rule 10 & 11: Win detection
  const won = newPath.length === level.targetCount && cellType === CellType.SAUCER;

  if (won) {
    effects.push({ type: 'AUDIO', sound: 'goal' });
    effects.push({ type: 'WIN' });
    // Rule 12: Level advance
    if (currentLevel < totalLevels) {
      effects.push({ type: 'LEVEL_ADVANCE', nextLevel: currentLevel + 1 });
    } else {
      effects.push({ type: 'AUDIO', sound: 'win' });
    }
  }

  return {
    state: {
      path: newPath,
      score: state.score + scoreAdd,
      levelScore: state.levelScore,
      collectedSet: newCollected,
      isWon: won,
      moveCount: state.moveCount + 1,
    },
    effects,
    valid: true,
  };
}
