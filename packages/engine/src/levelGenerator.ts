import { CellType, Point, LevelData } from './types';
import { GAME_CONSTANTS } from './constants';

export function generateLevel(levelIndex: number, rng: () => number): LevelData {
  const baseSize = GAME_CONSTANTS.BASE_GRID_SIZE;
  const growth = Math.floor((levelIndex - 1) / 3);
  const width = Math.min(GAME_CONSTANTS.MAX_GRID_SIZE, baseSize + growth);
  const height = Math.min(GAME_CONSTANTS.MAX_GRID_SIZE, baseSize + growth);

  const targetDensity = Math.min(
    GAME_CONSTANTS.TARGET_DENSITY_MAX,
    GAME_CONSTANTS.TARGET_DENSITY_BASE + levelIndex * GAME_CONSTANTS.TARGET_DENSITY_INCREMENT,
  );
  const targetLength = Math.floor(width * height * targetDensity);

  let attempts = 0;
  while (attempts < 200) {
    attempts++;

    const grid: CellType[][] = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => CellType.BOX),
    );

    const startPoint: Point = {
      x: Math.floor(rng() * width),
      y: Math.floor(rng() * height),
    };

    const path: Point[] = [startPoint];
    const visited = new Set<string>([`${startPoint.x},${startPoint.y}`]);

    const findPath = (curr: Point): boolean => {
      if (path.length === targetLength) return true;

      const neighbors = [
        { x: curr.x + 1, y: curr.y },
        { x: curr.x - 1, y: curr.y },
        { x: curr.x, y: curr.y + 1 },
        { x: curr.x, y: curr.y - 1 },
      ].filter(
        (n) =>
          n.x >= 0 && n.x < width && n.y >= 0 && n.y < height && !visited.has(`${n.x},${n.y}`),
      );

      for (let i = neighbors.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
      }

      for (const next of neighbors) {
        visited.add(`${next.x},${next.y}`);
        path.push(next);
        if (findPath(next)) return true;
        path.pop();
        visited.delete(`${next.x},${next.y}`);
      }

      return false;
    };

    if (findPath(startPoint)) {
      const endPoint = path[path.length - 1];

      path.forEach((p, idx) => {
        if (idx === 0) {
          grid[p.y][p.x] = CellType.START;
        } else if (idx === path.length - 1) {
          grid[p.y][p.x] = CellType.SAUCER;
        } else {
          grid[p.y][p.x] = CellType.EMPTY;
        }
      });

      let collectiblesPlaced = 0;
      const pathIndices = Array.from({ length: path.length - 2 }, (_, i) => i + 1);
      for (let i = pathIndices.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pathIndices[i], pathIndices[j]] = [pathIndices[j], pathIndices[i]];
      }

      for (const idx of pathIndices) {
        if (collectiblesPlaced >= GAME_CONSTANTS.MAX_COLLECTIBLES_PER_LEVEL) break;
        if (rng() < 0.2) {
          const p = path[idx];
          grid[p.y][p.x] = rng() < 0.2 ? CellType.YARN : CellType.TREAT;
          collectiblesPlaced++;
        }
      }

      // Non-path cells become WATER
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (grid[y][x] === CellType.BOX) {
            grid[y][x] = CellType.WATER;
          }
        }
      }

      return {
        grid,
        startPoint,
        endPoint,
        path,
        gridSize: Math.max(width, height),
        width,
        height,
        targetCount: path.length,
      };
    }
  }

  // Fallback level
  const fallbackPath: Point[] = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    { x: 3, y: 1 }, { x: 3, y: 2 },
    { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 },
    { x: 0, y: 3 }, { x: 1, y: 3 },
  ];
  return {
    grid: [
      [CellType.START, CellType.EMPTY, CellType.EMPTY, CellType.EMPTY],
      [CellType.WATER, CellType.WATER, CellType.WATER, CellType.EMPTY],
      [CellType.EMPTY, CellType.EMPTY, CellType.EMPTY, CellType.EMPTY],
      [CellType.EMPTY, CellType.SAUCER, CellType.WATER, CellType.WATER],
    ],
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 1, y: 3 },
    path: fallbackPath,
    gridSize: 4,
    width: 4,
    height: 4,
    targetCount: fallbackPath.length,
  };
}
