import { describe, it, expect } from 'vitest';
import { mirrorLevel } from '../src/mirrorMap.js';
import { generateLevel } from '../src/levelGenerator.js';
import { createPRNG } from '../src/prng.js';

describe('mirrorLevel', () => {
  it('reverses each row of the grid', () => {
    const level = generateLevel(3, createPRNG(42));
    const mirrored = mirrorLevel(level);

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        expect(mirrored.grid[y][x]).toBe(level.grid[y][level.width - 1 - x]);
      }
    }
  });

  it('mirrors start and end points', () => {
    const level = generateLevel(3, createPRNG(42));
    const mirrored = mirrorLevel(level);

    expect(mirrored.startPoint.x).toBe(level.width - 1 - level.startPoint.x);
    expect(mirrored.startPoint.y).toBe(level.startPoint.y);
    expect(mirrored.endPoint.x).toBe(level.width - 1 - level.endPoint.x);
    expect(mirrored.endPoint.y).toBe(level.endPoint.y);
  });

  it('mirrors path points', () => {
    const level = generateLevel(3, createPRNG(42));
    const mirrored = mirrorLevel(level);

    expect(mirrored.path.length).toBe(level.path.length);
    for (let i = 0; i < level.path.length; i++) {
      expect(mirrored.path[i].x).toBe(level.width - 1 - level.path[i].x);
      expect(mirrored.path[i].y).toBe(level.path[i].y);
    }
  });

  it('preserves grid dimensions', () => {
    const level = generateLevel(5, createPRNG(99));
    const mirrored = mirrorLevel(level);

    expect(mirrored.width).toBe(level.width);
    expect(mirrored.height).toBe(level.height);
    expect(mirrored.gridSize).toBe(level.gridSize);
    expect(mirrored.targetCount).toBe(level.targetCount);
  });

  it('double mirror returns original', () => {
    const level = generateLevel(3, createPRNG(42));
    const doubleMirrored = mirrorLevel(mirrorLevel(level));

    expect(doubleMirrored.grid).toEqual(level.grid);
    expect(doubleMirrored.startPoint).toEqual(level.startPoint);
    expect(doubleMirrored.endPoint).toEqual(level.endPoint);
    expect(doubleMirrored.path).toEqual(level.path);
  });
});
