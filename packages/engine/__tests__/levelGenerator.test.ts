import { describe, it, expect } from 'vitest';
import { generateLevel } from '../src/levelGenerator';
import { createPRNG } from '../src/prng';
import { CellType } from '../src/types';

describe('generateLevel', () => {
  it('returns a valid LevelData for level 1', () => {
    const rng = createPRNG(42);
    const level = generateLevel(1, rng);

    expect(level.grid).toBeDefined();
    expect(level.startPoint).toBeDefined();
    expect(level.endPoint).toBeDefined();
    expect(level.path).toBeDefined();
    expect(level.path.length).toBe(level.targetCount);
    expect(level.width).toBeGreaterThanOrEqual(4);
    expect(level.height).toBeGreaterThanOrEqual(4);
  });

  it('start cell is START type', () => {
    const rng = createPRNG(42);
    const level = generateLevel(1, rng);
    expect(level.grid[level.startPoint.y][level.startPoint.x]).toBe(CellType.START);
  });

  it('end cell is SAUCER type', () => {
    const rng = createPRNG(42);
    const level = generateLevel(1, rng);
    expect(level.grid[level.endPoint.y][level.endPoint.x]).toBe(CellType.SAUCER);
  });

  it('non-path cells are WATER', () => {
    const rng = createPRNG(42);
    const level = generateLevel(1, rng);
    const pathSet = new Set(level.path.map(p => `${p.x},${p.y}`));
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        if (!pathSet.has(`${x},${y}`)) {
          expect(level.grid[y][x]).toBe(CellType.WATER);
        }
      }
    }
  });

  it('is deterministic — same seed + level produces same output', () => {
    const level1 = generateLevel(3, createPRNG(999));
    const level2 = generateLevel(3, createPRNG(999));
    expect(level1.grid).toEqual(level2.grid);
    expect(level1.startPoint).toEqual(level2.startPoint);
    expect(level1.endPoint).toEqual(level2.endPoint);
    expect(level1.path).toEqual(level2.path);
  });

  it('path is contiguous — each step is adjacent', () => {
    const rng = createPRNG(42);
    const level = generateLevel(5, rng);
    for (let i = 1; i < level.path.length; i++) {
      const prev = level.path[i - 1];
      const curr = level.path[i];
      const dist = Math.abs(prev.x - curr.x) + Math.abs(prev.y - curr.y);
      expect(dist).toBe(1);
    }
  });

  it('grid grows with level index', () => {
    const small = generateLevel(1, createPRNG(42));
    const large = generateLevel(10, createPRNG(42));
    expect(large.width).toBeGreaterThanOrEqual(small.width);
  });

  it('collectibles are limited to MAX_COLLECTIBLES_PER_LEVEL', () => {
    const rng = createPRNG(42);
    const level = generateLevel(5, rng);
    let collectibles = 0;
    for (const row of level.grid) {
      for (const cell of row) {
        if (cell === CellType.TREAT || cell === CellType.YARN) collectibles++;
      }
    }
    expect(collectibles).toBeLessThanOrEqual(3);
  });
});
