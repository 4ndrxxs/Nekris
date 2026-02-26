import { describe, it, expect } from 'vitest';
import { processMove, createInitialState } from '../src/gameEngine.js';
import { CellType, Point, EngineState, LevelData } from '../src/types.js';

function makeTestLevel(): LevelData {
  const grid: CellType[][] = [
    [CellType.START, CellType.EMPTY, CellType.EMPTY],
    [CellType.WATER, CellType.EMPTY, CellType.YARN],
    [CellType.WATER, CellType.EMPTY, CellType.SAUCER],
  ];
  const path: Point[] = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 2, y: 1 }, { x: 1, y: 1 },
    { x: 1, y: 2 }, { x: 2, y: 2 },
  ];
  return {
    grid, startPoint: { x: 0, y: 0 }, endPoint: { x: 2, y: 2 },
    path, gridSize: 3, width: 3, height: 3, targetCount: 7,
  };
}

describe('createInitialState', () => {
  it('creates state at start point with score 0', () => {
    const level = makeTestLevel();
    const state = createInitialState(level);
    expect(state.path).toEqual([{ x: 0, y: 0 }]);
    expect(state.score).toBe(0);
    expect(state.levelScore).toBe(0);
    expect(state.isWon).toBe(false);
    expect(state.moveCount).toBe(0);
    expect(state.collectedSet.size).toBe(0);
  });
});

describe('processMove', () => {
  it('Rule 1: cannot move if already won', () => {
    const level = makeTestLevel();
    const state = createInitialState(level);
    const wonState: EngineState = { ...state, isWon: true };
    const result = processMove(wonState, { x: 1, y: 0 }, level);
    expect(result.valid).toBe(false);
  });

  it('Rule 2: backspace — click second-to-last removes last', () => {
    const level = makeTestLevel();
    let state = createInitialState(level);
    const r1 = processMove(state, { x: 1, y: 0 }, level);
    expect(r1.valid).toBe(true);
    state = r1.state;
    expect(state.path.length).toBe(2);

    const r2 = processMove(state, { x: 0, y: 0 }, level);
    expect(r2.valid).toBe(true);
    expect(r2.state.path.length).toBe(1);
    expect(r2.effects.some(e => e.type === 'AUDIO' && e.sound === 'backspace')).toBe(true);
  });

  it('Rule 3: cannot click non-adjacent cell', () => {
    const level = makeTestLevel();
    const state = createInitialState(level);
    const result = processMove(state, { x: 2, y: 2 }, level);
    expect(result.valid).toBe(false);
  });

  it('Rule 5: cannot click obstacle', () => {
    const level = makeTestLevel();
    const state = createInitialState(level);
    const couchLevel: LevelData = {
      ...level,
      grid: [
        [CellType.START, CellType.COUCH, CellType.EMPTY],
        [CellType.EMPTY, CellType.EMPTY, CellType.EMPTY],
        [CellType.EMPTY, CellType.EMPTY, CellType.SAUCER],
      ],
    };
    const result = processMove(state, { x: 1, y: 0 }, couchLevel);
    expect(result.valid).toBe(false);
  });

  it('Rule 6: WATER cell triggers WATER_RESET', () => {
    const level = makeTestLevel();
    const state = createInitialState(level);
    const result = processMove(state, { x: 0, y: 1 }, level);
    expect(result.valid).toBe(true);
    expect(result.effects.some(e => e.type === 'WATER_RESET')).toBe(true);
  });

  it('Rule 7: TREAT gives TIMER_ADD +5s', () => {
    const treatLevel: LevelData = {
      ...makeTestLevel(),
      grid: [
        [CellType.START, CellType.TREAT, CellType.EMPTY],
        [CellType.WATER, CellType.EMPTY, CellType.EMPTY],
        [CellType.WATER, CellType.EMPTY, CellType.SAUCER],
      ],
    };
    const state = createInitialState(treatLevel);
    const result = processMove(state, { x: 1, y: 0 }, treatLevel, { isTreatActive: true });
    expect(result.valid).toBe(true);
    expect(result.effects.some(e => e.type === 'TIMER_ADD' && e.seconds === 5)).toBe(true);
    expect(result.effects.some(e => e.type === 'AUDIO' && e.sound === 'fish')).toBe(true);
  });

  it('Rule 8: YARN gives +50 score', () => {
    const level = makeTestLevel();
    let state = createInitialState(level);
    state = processMove(state, { x: 1, y: 0 }, level).state;
    state = processMove(state, { x: 2, y: 0 }, level).state;
    const result = processMove(state, { x: 2, y: 1 }, level, { isYarnActive: true });
    expect(result.valid).toBe(true);
    expect(result.effects.some(e => e.type === 'AUDIO' && e.sound === 'yarn')).toBe(true);
    expect(result.state.score).toBe(state.score + 60);
  });

  it('Rule 9: normal step gives +10 score and stretch audio', () => {
    const level = makeTestLevel();
    const state = createInitialState(level);
    const result = processMove(state, { x: 1, y: 0 }, level);
    expect(result.valid).toBe(true);
    expect(result.state.score).toBe(10);
    expect(result.effects.some(e => e.type === 'AUDIO' && e.sound === 'stretch')).toBe(true);
  });

  it('Rule 13: collected items not double-counted', () => {
    const treatLevel: LevelData = {
      ...makeTestLevel(),
      grid: [
        [CellType.START, CellType.TREAT, CellType.EMPTY],
        [CellType.WATER, CellType.EMPTY, CellType.EMPTY],
        [CellType.WATER, CellType.EMPTY, CellType.SAUCER],
      ],
    };
    let state = createInitialState(treatLevel);
    const r1 = processMove(state, { x: 1, y: 0 }, treatLevel, { isTreatActive: true });
    state = r1.state;
    expect(state.collectedSet.has('1,0')).toBe(true);

    state = processMove(state, { x: 0, y: 0 }, treatLevel).state;
    const r2 = processMove(state, { x: 1, y: 0 }, treatLevel, { isTreatActive: true });
    expect(r2.effects.some(e => e.type === 'TIMER_ADD')).toBe(false);
  });

  it('Rule 11 & 12: win when all non-obstacle cells filled and on SAUCER', () => {
    const level = makeTestLevel();
    let state = createInitialState(level);
    const moves: Point[] = [
      { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 },
      { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 },
    ];
    for (let i = 0; i < moves.length - 1; i++) {
      const result = processMove(state, moves[i], level, { isYarnActive: true });
      expect(result.valid).toBe(true);
      state = result.state;
      expect(state.isWon).toBe(false);
    }
    const finalResult = processMove(state, moves[moves.length - 1], level, {
      currentLevel: 1, totalLevels: 12, isYarnActive: true,
    });
    expect(finalResult.valid).toBe(true);
    expect(finalResult.state.isWon).toBe(true);
    expect(finalResult.effects.some(e => e.type === 'WIN')).toBe(true);
    expect(finalResult.effects.some(e => e.type === 'AUDIO' && e.sound === 'goal')).toBe(true);
    expect(finalResult.effects.some(e => e.type === 'LEVEL_ADVANCE')).toBe(true);
  });
});
