import { LevelData, Point } from './types.js';

export function mirrorLevel(level: LevelData): LevelData {
  const { grid, startPoint, endPoint, path, gridSize, width, height, targetCount } = level;
  const mirroredGrid = grid.map((row) => [...row].reverse());
  const mx = (p: Point): Point => ({ x: width - 1 - p.x, y: p.y });

  return {
    grid: mirroredGrid,
    startPoint: mx(startPoint),
    endPoint: mx(endPoint),
    path: path.map(mx),
    gridSize,
    width,
    height,
    targetCount,
  };
}
