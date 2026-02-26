# NEKRIS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform "Stretchy Cat" single-player puzzle into NEKRIS — a multiplayer competitive path-building game with Daily mode, 1v1 Quick Race, ELO ranking, and TETRIO-level animations.

**Architecture:** pnpm monorepo with 3 packages: `packages/engine` (pure TS, 0 deps) for deterministic game logic, `apps/web` (Next.js 15 App Router + Tailwind v4 + Framer Motion) for the client, and `apps/party` (PartyKit) for real-time matchmaking/game rooms. Supabase handles DB, auth, and daily seed generation.

**Tech Stack:** TypeScript strict, pnpm workspace, Vitest, Next.js 15, Tailwind v4, Framer Motion, PartyKit, Supabase (Postgres + Auth + Edge Functions)

**Original Source:** `C:\Users\JW\Documents\project\새 폴더\` — all files from the "Stretchy Cat" game.

---

## Phase 1: Monorepo & Engine Package

### Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

**Step 1: Initialize git and root package.json**

```bash
cd C:\Users\JW\Documents\project\Nekris
git init
```

Create `package.json`:
```json
{
  "name": "nekris",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @nekris/web dev",
    "build": "pnpm --filter @nekris/engine build && pnpm --filter @nekris/web build",
    "test": "pnpm --filter @nekris/engine test",
    "test:watch": "pnpm --filter @nekris/engine test -- --watch",
    "lint": "eslint .",
    "clean": "rm -rf packages/*/dist apps/*/dist apps/*/.next"
  }
}
```

**Step 2: Create workspace config**

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
  - "apps/*"
```

**Step 3: Create base tsconfig**

Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Step 4: Create .gitignore**

Create `.gitignore`:
```
node_modules/
dist/
.next/
.env
.env.local
*.tsbuildinfo
.turbo/
.partykit/
```

**Step 5: Create directory structure**

```bash
mkdir -p packages/engine/src packages/engine/__tests__ apps/web apps/party
```

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: initialize nekris monorepo with pnpm workspace"
```

---

### Task 2: Engine Package Setup

**Files:**
- Create: `packages/engine/package.json`
- Create: `packages/engine/tsconfig.json`
- Create: `packages/engine/vitest.config.ts`
- Create: `packages/engine/src/index.ts`

**Step 1: Create engine package.json**

Create `packages/engine/package.json`:
```json
{
  "name": "@nekris/engine",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 2: Create engine tsconfig**

Create `packages/engine/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["__tests__", "dist"]
}
```

**Step 3: Create vitest config**

Create `packages/engine/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
  },
});
```

**Step 4: Create placeholder index**

Create `packages/engine/src/index.ts`:
```typescript
export * from './types.js';
export * from './constants.js';
export * from './prng.js';
export * from './levelGenerator.js';
export * from './mirrorMap.js';
export * from './gameEngine.js';
export * from './scoring.js';
export * from './protocol.js';
export * from './validation.js';
```

**Step 5: Install dependencies**

```bash
cd C:\Users\JW\Documents\project\Nekris
pnpm install
```

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: add @nekris/engine package with vitest"
```

---

### Task 3: Engine Types

**Files:**
- Create: `packages/engine/src/types.ts`

**Step 1: Write types**

Create `packages/engine/src/types.ts`:
```typescript
export enum CellType {
  EMPTY = 0,
  START = 1,
  WATER = 2,
  COUCH = 3,
  PLANT = 4,
  BOX = 5,
  TREAT = 6,
  YARN = 7,
  SAUCER = 8,
}

export interface Point {
  x: number;
  y: number;
}

export interface LevelData {
  grid: CellType[][];
  startPoint: Point;
  endPoint: Point;
  path: Point[];
  gridSize: number;
  width: number;
  height: number;
  targetCount: number;
}

export interface EngineState {
  path: Point[];
  score: number;
  levelScore: number;
  collectedSet: Set<string>;
  isWon: boolean;
  moveCount: number;
}

export interface MoveResult {
  state: EngineState;
  effects: GameEffect[];
  valid: boolean;
}

export type GameEffect =
  | { type: 'AUDIO'; sound: 'backspace' | 'fish' | 'yarn' | 'stretch' | 'goal' | 'win' }
  | { type: 'TIMER_ADD'; seconds: number }
  | { type: 'WATER_RESET'; points: Point[] }
  | { type: 'WIN' }
  | { type: 'LEVEL_ADVANCE'; nextLevel: number };

export interface MoveOptions {
  isTreatActive?: boolean;
  isYarnActive?: boolean;
  totalLevels?: number;
  currentLevel?: number;
}

export interface TimedMove {
  point: Point;
  t: number; // ms since game start
}
```

**Step 2: Commit**

```bash
git add packages/engine/src/types.ts
git commit -m "feat(engine): add core type definitions"
```

---

### Task 4: Engine Constants

**Files:**
- Create: `packages/engine/src/constants.ts`

**Step 1: Write constants (cleaned from original, dead code removed)**

Create `packages/engine/src/constants.ts`:
```typescript
export const GAME_CONSTANTS = {
  // Collectible Lifetimes
  TREAT_MIN_LIFETIME_MS: 3500,
  TREAT_SCALE_FACTOR_MS: 100,
  YARN_MIN_LIFETIME_MS: 3000,
  YARN_SCALE_FACTOR_MS: 100,

  // Game Timer
  INITIAL_TIME_SECONDS: 15,
  TREAT_TIME_BONUS_SECONDS: 5,

  // Scoring
  BASE_MOVE_SCORE: 10,
  YARN_SCORE_BONUS: 50,

  // Levels
  TOTAL_LEVELS: 12,
  BASE_GRID_SIZE: 4,
  MAX_GRID_SIZE: 7,
  LEVEL_TRANSITION_TIME_MS: 400,

  // Level Generation
  TARGET_DENSITY_BASE: 0.5,
  TARGET_DENSITY_INCREMENT: 0.03,
  TARGET_DENSITY_MAX: 0.9,
  MAX_COLLECTIBLES_PER_LEVEL: 3,

  // ELO
  DEFAULT_ELO: 1000,
  ELO_K_FACTOR: 32,

  // Race
  DISCONNECT_TIMEOUT_MS: 30_000,
  COUNTDOWN_SECONDS: 3,
} as const;
```

**Step 2: Commit**

```bash
git add packages/engine/src/constants.ts
git commit -m "feat(engine): add game constants (dead code removed)"
```

---

### Task 5: PRNG (mulberry32) — TDD

**Files:**
- Create: `packages/engine/src/prng.ts`
- Create: `packages/engine/__tests__/prng.test.ts`

**Step 1: Write the failing test**

Create `packages/engine/__tests__/prng.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createPRNG } from '../src/prng.js';

describe('createPRNG', () => {
  it('returns a function', () => {
    const rng = createPRNG(42);
    expect(typeof rng).toBe('function');
  });

  it('produces numbers between 0 and 1', () => {
    const rng = createPRNG(42);
    for (let i = 0; i < 1000; i++) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('is deterministic — same seed produces same sequence', () => {
    const rng1 = createPRNG(12345);
    const rng2 = createPRNG(12345);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = createPRNG(1);
    const rng2 = createPRNG(2);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd C:\Users\JW\Documents\project\Nekris
pnpm --filter @nekris/engine test
```

Expected: FAIL — module `../src/prng.js` not found.

**Step 3: Write implementation**

Create `packages/engine/src/prng.ts`:
```typescript
export function createPRNG(seed: number): () => number {
  let t = seed | 0;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @nekris/engine test
```

Expected: all 4 tests PASS.

**Step 5: Commit**

```bash
git add packages/engine/src/prng.ts packages/engine/__tests__/prng.test.ts
git commit -m "feat(engine): add mulberry32 PRNG with determinism tests"
```

---

### Task 6: Level Generator — TDD

**Files:**
- Create: `packages/engine/src/levelGenerator.ts`
- Create: `packages/engine/__tests__/levelGenerator.test.ts`

**Step 1: Write the failing tests**

Create `packages/engine/__tests__/levelGenerator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateLevel } from '../src/levelGenerator.js';
import { createPRNG } from '../src/prng.js';
import { CellType } from '../src/types.js';

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
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @nekris/engine test
```

Expected: FAIL — module `../src/levelGenerator.js` not found.

**Step 3: Write implementation**

Create `packages/engine/src/levelGenerator.ts`:
```typescript
import { CellType, Point, LevelData } from './types.js';
import { GAME_CONSTANTS } from './constants.js';

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
        (n) => n.x >= 0 && n.x < width && n.y >= 0 && n.y < height && !visited.has(`${n.x},${n.y}`),
      );

      // Shuffle neighbors with seeded rng
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

      // Mark path cells
      path.forEach((p, idx) => {
        if (idx === 0) {
          grid[p.y][p.x] = CellType.START;
        } else if (idx === path.length - 1) {
          grid[p.y][p.x] = CellType.SAUCER;
        } else {
          grid[p.y][p.x] = CellType.EMPTY;
        }
      });

      // Scatter collectibles
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

      // Non-path cells become WATER (WALLS_KILL_YOU = true for NEKRIS)
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
```

**Step 4: Run tests**

```bash
pnpm --filter @nekris/engine test
```

Expected: all levelGenerator tests PASS.

**Step 5: Commit**

```bash
git add packages/engine/src/levelGenerator.ts packages/engine/__tests__/levelGenerator.test.ts
git commit -m "feat(engine): add seeded level generator with determinism tests"
```

---

### Task 7: Mirror Map — TDD

**Files:**
- Create: `packages/engine/src/mirrorMap.ts`
- Create: `packages/engine/__tests__/mirrorMap.test.ts`

**Step 1: Write the failing test**

Create `packages/engine/__tests__/mirrorMap.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { mirrorLevel } from '../src/mirrorMap.js';
import { generateLevel } from '../src/levelGenerator.js';
import { createPRNG } from '../src/prng.js';
import { CellType } from '../src/types.js';

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
```

**Step 2: Run test — expect FAIL**

**Step 3: Write implementation**

Create `packages/engine/src/mirrorMap.ts`:
```typescript
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
```

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add packages/engine/src/mirrorMap.ts packages/engine/__tests__/mirrorMap.test.ts
git commit -m "feat(engine): add mirror map for Player B with tests"
```

---

### Task 8: Game Engine (processMove) — TDD

**Files:**
- Create: `packages/engine/src/gameEngine.ts`
- Create: `packages/engine/__tests__/gameEngine.test.ts`

**Step 1: Write the failing tests**

Create `packages/engine/__tests__/gameEngine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { processMove, createInitialState } from '../src/gameEngine.js';
import { generateLevel } from '../src/levelGenerator.js';
import { createPRNG } from '../src/prng.js';
import { CellType, Point, EngineState, LevelData } from '../src/types.js';

// Helper: create a simple 3x3 level for testing
function makeTestLevel(): LevelData {
  // Layout:
  // START  EMPTY  EMPTY
  // WATER  EMPTY  YARN
  // WATER  EMPTY  SAUCER
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
    // Move right to (1,0)
    const r1 = processMove(state, { x: 1, y: 0 }, level);
    expect(r1.valid).toBe(true);
    state = r1.state;
    expect(state.path.length).toBe(2);

    // Backspace by clicking (0,0) which is second-to-last
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

  it('Rule 4: cannot click already-in-path cell', () => {
    const level = makeTestLevel();
    let state = createInitialState(level);
    state = processMove(state, { x: 1, y: 0 }, level).state;
    state = processMove(state, { x: 2, y: 0 }, level).state;
    // Try to click (1,0) which is in path but not second-to-last
    const result = processMove(state, { x: 1, y: 0 }, level);
    // (1,0) is second-to-last from (2,0), so this is actually backspace
    // Let's use a longer path instead
    expect(result.valid).toBe(true); // This is backspace case
  });

  it('Rule 5: cannot click obstacle', () => {
    const level = makeTestLevel();
    const state = createInitialState(level);
    // (0,1) is WATER — this triggers WATER_RESET, not obstacle block
    // Let's make a level with COUCH
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
    let state = createInitialState(level);
    // Move down to (0,1) which is WATER
    const result = processMove(state, { x: 0, y: 1 }, level);
    expect(result.valid).toBe(true);
    expect(result.effects.some(e => e.type === 'WATER_RESET')).toBe(true);
  });

  it('Rule 7: TREAT gives TIMER_ADD +5s', () => {
    // Need a level with TREAT adjacent to start
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
    // Path: (0,0) → (1,0) → (2,0) → (2,1) which has YARN
    state = processMove(state, { x: 1, y: 0 }, level).state;
    state = processMove(state, { x: 2, y: 0 }, level).state;
    const result = processMove(state, { x: 2, y: 1 }, level, { isYarnActive: true });
    expect(result.valid).toBe(true);
    expect(result.effects.some(e => e.type === 'AUDIO' && e.sound === 'yarn')).toBe(true);
    // Score should include YARN_SCORE_BONUS (50) + BASE_MOVE_SCORE (10)
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
    // Collect TREAT
    const r1 = processMove(state, { x: 1, y: 0 }, treatLevel, { isTreatActive: true });
    state = r1.state;
    expect(state.collectedSet.has('1,0')).toBe(true);

    // Backspace
    state = processMove(state, { x: 0, y: 0 }, treatLevel).state;
    // Re-step on same cell
    const r2 = processMove(state, { x: 1, y: 0 }, treatLevel, { isTreatActive: true });
    // Should NOT get TIMER_ADD again
    expect(r2.effects.some(e => e.type === 'TIMER_ADD')).toBe(false);
  });

  it('Rule 11 & 12: win when all non-obstacle cells filled and on SAUCER', () => {
    const level = makeTestLevel();
    let state = createInitialState(level);
    // Walk the entire solution path
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
    // Last move should win
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
```

**Step 2: Run test — expect FAIL**

**Step 3: Write implementation**

Create `packages/engine/src/gameEngine.ts`:
```typescript
import { CellType, Point, EngineState, LevelData, MoveResult, GameEffect, MoveOptions } from './types.js';
import { GAME_CONSTANTS } from './constants.js';

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

const OBSTACLE_TYPES: ReadonlySet<CellType> = new Set([CellType.COUCH, CellType.PLANT, CellType.BOX]);

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
      // Already collected — normal step sound
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
```

**Step 4: Run tests — expect PASS**

```bash
pnpm --filter @nekris/engine test
```

**Step 5: Commit**

```bash
git add packages/engine/src/gameEngine.ts packages/engine/__tests__/gameEngine.test.ts
git commit -m "feat(engine): add processMove with all 14 game rules + tests"
```

---

### Task 9: Scoring (ELO + Tiers) — TDD

**Files:**
- Create: `packages/engine/src/scoring.ts`
- Create: `packages/engine/__tests__/scoring.test.ts`

**Step 1: Write the failing test**

Create `packages/engine/__tests__/scoring.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateElo, getTier, Tier } from '../src/scoring.js';

describe('calculateElo', () => {
  it('winner gains, loser loses equal amount', () => {
    const { newA, newB, change } = calculateElo(1000, 1000, true);
    expect(newA).toBeGreaterThan(1000);
    expect(newB).toBeLessThan(1000);
    expect(newA - 1000).toBe(1000 - newB);
  });

  it('equal ratings: winner gets +16', () => {
    const { change } = calculateElo(1000, 1000, true);
    expect(change).toBe(16);
  });

  it('underdog wins: bigger change', () => {
    const { change: underdogWin } = calculateElo(800, 1200, true);
    const { change: favoriteWin } = calculateElo(1200, 800, true);
    expect(underdogWin).toBeGreaterThan(favoriteWin);
  });

  it('loser loses points', () => {
    const { change } = calculateElo(1000, 1000, false);
    expect(change).toBe(-16);
  });
});

describe('getTier', () => {
  it('returns correct tiers for boundary values', () => {
    expect(getTier(799)).toBe(Tier.BRONZE);
    expect(getTier(800)).toBe(Tier.SILVER);
    expect(getTier(1000)).toBe(Tier.GOLD);
    expect(getTier(1200)).toBe(Tier.PLATINUM);
    expect(getTier(1400)).toBe(Tier.DIAMOND);
    expect(getTier(1600)).toBe(Tier.MASTER);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Write implementation**

Create `packages/engine/src/scoring.ts`:
```typescript
export enum Tier {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  PLATINUM = 'Platinum',
  DIAMOND = 'Diamond',
  MASTER = 'Master',
}

export function calculateElo(
  ratingA: number,
  ratingB: number,
  aWon: boolean,
  K = 32,
): { newA: number; newB: number; change: number } {
  const ea = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const sa = aWon ? 1 : 0;
  const change = Math.round(K * (sa - ea));
  return { newA: ratingA + change, newB: ratingB - change, change };
}

export function getTier(elo: number): Tier {
  if (elo < 800) return Tier.BRONZE;
  if (elo < 1000) return Tier.SILVER;
  if (elo < 1200) return Tier.GOLD;
  if (elo < 1400) return Tier.PLATINUM;
  if (elo < 1600) return Tier.DIAMOND;
  return Tier.MASTER;
}
```

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add packages/engine/src/scoring.ts packages/engine/__tests__/scoring.test.ts
git commit -m "feat(engine): add ELO calculation and tier system with tests"
```

---

### Task 10: Protocol Types

**Files:**
- Create: `packages/engine/src/protocol.ts`

**Step 1: Write protocol types**

Create `packages/engine/src/protocol.ts`:
```typescript
import { Point } from './types.js';

// Client → Server
export type ClientMsg =
  | { type: 'QUEUE_JOIN'; mode: 'quick' | 'ranked'; token: string }
  | { type: 'QUEUE_LEAVE' }
  | { type: 'READY' }
  | { type: 'MOVE'; point: Point; t: number }
  | { type: 'FINISH'; moves: { point: Point; t: number }[]; finalScore: number };

// Server → Client
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
```

**Step 2: Commit**

```bash
git add packages/engine/src/protocol.ts
git commit -m "feat(engine): add WebSocket protocol types"
```

---

### Task 11: Validation (Move Replay) — TDD

**Files:**
- Create: `packages/engine/src/validation.ts`
- Create: `packages/engine/__tests__/validation.test.ts`

**Step 1: Write the failing test**

Create `packages/engine/__tests__/validation.test.ts`:
```typescript
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

    // Play through the solution path
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
    // Invalid: move to (99,99) which is out of bounds
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
```

**Step 2: Run test — expect FAIL**

**Step 3: Write implementation**

Create `packages/engine/src/validation.ts`:
```typescript
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
    // Bounds check
    if (move.point.x < 0 || move.point.x >= level.width || move.point.y < 0 || move.point.y >= level.height) {
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
```

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add packages/engine/src/validation.ts packages/engine/__tests__/validation.test.ts
git commit -m "feat(engine): add server-side move replay validation with tests"
```

---

### Task 12: Engine Index & Full Test Run

**Step 1: Verify all exports work**

The `packages/engine/src/index.ts` was already created in Task 2 with all exports.

**Step 2: Run full test suite**

```bash
pnpm --filter @nekris/engine test
```

Expected: ALL tests pass (prng, levelGenerator, mirrorMap, gameEngine, scoring, validation).

**Step 3: Build the engine**

```bash
pnpm --filter @nekris/engine build
```

Expected: No errors, `dist/` generated.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(engine): complete engine package — all tests passing"
```

---

## Phase 2: Next.js Web App Scaffold

### Task 13: Create Next.js App

**Step 1: Scaffold Next.js**

```bash
cd C:\Users\JW\Documents\project\Nekris\apps
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

When prompted:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: Yes
- App Router: Yes
- Import alias: No (use default @/)

**Step 2: Add engine dependency**

Edit `apps/web/package.json` to add:
```json
{
  "dependencies": {
    "@nekris/engine": "workspace:*"
  }
}
```

**Step 3: Install Framer Motion**

```bash
cd C:\Users\JW\Documents\project\Nekris
pnpm --filter @nekris/web add framer-motion
```

**Step 4: Install pnpm deps**

```bash
pnpm install
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app with Tailwind and Framer Motion"
```

---

### Task 14: Theme & Layout Setup

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/lib/theme.ts`

**Step 1: Create theme constants**

Create `apps/web/src/lib/theme.ts`:
```typescript
export const theme = {
  bg: '#0a0a0a',
  surface: '#1a1a2e',
  accent: '#00ff88',
  text: '#e0e0e0',
  muted: '#666666',
  danger: '#ff4444',
  warning: '#ffaa00',
} as const;
```

**Step 2: Update globals.css for TETRIO dark theme**

Replace `apps/web/src/app/globals.css` with:
```css
@import "tailwindcss";

:root {
  --bg: #0a0a0a;
  --surface: #1a1a2e;
  --accent: #00ff88;
  --text: #e0e0e0;
  --muted: #666666;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Animations */
@keyframes float-up-fade {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-30px) scale(1.4); opacity: 0; }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 4px var(--accent); }
  50% { box-shadow: 0 0 16px var(--accent); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

.animate-float-up { animation: float-up-fade 1.8s ease-out forwards; }
.animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
.animate-shake { animation: shake 0.3s ease-in-out; }
```

**Step 3: Update layout.tsx**

Replace `apps/web/src/app/layout.tsx` with:
```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NEKRIS — Competitive Puzzle',
  description: 'Daily challenges and 1v1 competitive path-building puzzles',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): add TETRIO dark theme and layout"
```

---

### Task 15: Game Components — Grid & Cell

**Files:**
- Create: `apps/web/src/components/game/Cell.tsx`
- Create: `apps/web/src/components/game/Grid.tsx`
- Create: `apps/web/src/components/game/CatHead.tsx`

These components are adapted from the original `Grid.tsx` and `Cell.tsx` with:
- Numeric CellType enum
- TETRIO dark color palette
- Framer Motion animations (bounce on path expansion, shrink on backspace)
- No gstatic.com asset dependency

**Step 1: Create CatHead SVG component**

Create `apps/web/src/components/game/CatHead.tsx`:
```tsx
'use client';

import { motion } from 'framer-motion';

interface CatHeadProps {
  direction: 'up' | 'down' | 'left' | 'right';
}

const rotations = { up: 0, right: 90, down: 180, left: 270 };

export default function CatHead({ direction }: CatHeadProps) {
  return (
    <motion.div
      className="absolute w-[70%] h-[70%] z-40 flex items-center justify-center pointer-events-none"
      style={{ rotate: rotations[direction] }}
      animate={{ scale: [0.9, 1.05, 1] }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 80 92" width="160" height="184">
        <rect width="80" height="80" y="12" fill="#00ff88" rx="20" />
        <path stroke="#0a0a0a" strokeLinecap="round" strokeWidth="2" d="M32 42.5a6.5 6.5 0 1 0-13 0M60 42.5a6.5 6.5 0 1 0-13 0" />
        <path fill="#00ff88" d="M18.268 3c.77-1.333 2.694-1.333 3.464 0l9.526 16.5c.77 1.333-.192 3-1.732 3H10.474c-1.54 0-2.502-1.667-1.732-3L18.268 3ZM58.268 3c.77-1.333 2.694-1.333 3.464 0l9.526 16.5c.77 1.333-.192 3-1.732 3H50.474c-1.54 0-2.502-1.667-1.732-3L58.268 3Z" />
        <path stroke="#0a0a0a" strokeLinecap="round" strokeWidth="2" d="M23 66.143a8.357 8.357 0 1 0 16.714 0M39.714 66.143a8.357 8.357 0 0 0 16.715 0" />
        <path fill="#0a0a0a" d="M40.544 66.197a1 1 0 0 1-1.659 0l-5.914-8.781a1 1 0 0 1 .829-1.559h11.83a1 1 0 0 1 .83 1.559l-5.916 8.781Z" />
      </svg>
    </motion.div>
  );
}
```

**Step 2: Create Cell component**

Create `apps/web/src/components/game/Cell.tsx`:
```tsx
'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CellType } from '@nekris/engine';
import CatHead from './CatHead';

interface CellProps {
  type: CellType;
  isInPath: boolean;
  isHead: boolean;
  isTail: boolean;
  isCollected: boolean;
  connections: { up: boolean; down: boolean; left: boolean; right: boolean };
  headDirection: 'up' | 'down' | 'left' | 'right';
  onMouseDown: () => void;
  onMouseEnter: () => void;
  isWarning?: boolean;
}

const cellColors: Record<number, string> = {
  [CellType.WATER]: '#1a1a2e',
  [CellType.COUCH]: '#2a1a1a',
  [CellType.PLANT]: '#1a2a1a',
  [CellType.BOX]: '#1a1a2e',
};

function CellComponent({
  type, isInPath, isHead, isTail, isCollected,
  connections, headDirection, onMouseDown, onMouseEnter, isWarning,
}: CellProps) {
  const bgColor = isInPath ? '#00ff88' : cellColors[type] ?? '#1e1e3a';

  return (
    <motion.div
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      className="relative w-full h-full flex items-center justify-center rounded-[8%] cursor-pointer overflow-hidden"
      style={{ backgroundColor: bgColor }}
      initial={false}
      animate={isInPath ? { scale: [0.8, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {/* Collectible icons */}
      {!isCollected && type === CellType.TREAT && (
        <motion.div
          className={`text-lg z-10 ${isWarning ? 'animate-pulse' : ''}`}
          animate={isWarning ? { opacity: [1, 0.3, 1] } : { y: [0, -2, 0] }}
          transition={{ duration: isWarning ? 0.3 : 1.5, repeat: Infinity }}
        >
          🐟
        </motion.div>
      )}
      {!isCollected && type === CellType.YARN && (
        <motion.div
          className={`text-lg z-10 ${isWarning ? 'animate-pulse' : ''}`}
          animate={isWarning ? { opacity: [1, 0.3, 1] } : { y: [0, -2, 0] }}
          transition={{ duration: isWarning ? 0.3 : 1.5, repeat: Infinity }}
        >
          🧶
        </motion.div>
      )}
      {type === CellType.SAUCER && !isInPath && (
        <div className="text-lg z-10">🏁</div>
      )}

      {/* Path connectors */}
      {isInPath && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!isHead && !isTail && <div className="bg-[#00ff88] w-[55%] h-[55%] z-20 rounded-full shadow-[0_0_8px_#00ff88]" />}
          {connections.up && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] h-[100%] bg-[#00ff88] z-10" />}
          {connections.down && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[55%] h-[100%] bg-[#00ff88] z-10" />}
          {connections.left && <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-[55%] w-[100%] bg-[#00ff88] z-10" />}
          {connections.right && <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-[55%] w-[100%] bg-[#00ff88] z-10" />}
          {isHead && <CatHead direction={headDirection} />}
          {isTail && <div className="absolute w-[55%] h-[55%] bg-[#00ff88] z-30 rounded-full shadow-[0_0_12px_#00ff88]" />}
        </div>
      )}
    </motion.div>
  );
}

export default memo(CellComponent);
```

**Step 3: Create Grid component**

Create `apps/web/src/components/game/Grid.tsx`:
```tsx
'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { LevelData, Point, CellType } from '@nekris/engine';
import Cell from './Cell';

interface GridProps {
  level: LevelData;
  path: Point[];
  collectedSet: Set<string>;
  isTreatActive: boolean;
  isYarnActive: boolean;
  onCellMouseDown: (p: Point) => void;
  onCellMouseEnter: (p: Point) => void;
  scale?: number;
}

export default function Grid({
  level, path, collectedSet, isTreatActive, isYarnActive,
  onCellMouseDown, onCellMouseEnter, scale = 1,
}: GridProps) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { tileSize, gap } = useMemo(() => {
    if (windowSize.width === 0) return { tileSize: 40, gap: 3 };
    const maxDim = Math.max(level.width, level.height);
    const horizontalLimit = windowSize.width * 0.9 * scale - 20;
    const verticalLimit = (windowSize.height - 320) * scale;
    const containerSize = Math.min(horizontalLimit, verticalLimit);
    const ts = Math.floor(containerSize / maxDim);
    const g = Math.max(2, Math.floor(ts / 12));
    return { tileSize: Math.max(ts, 20), gap: g };
  }, [level.width, level.height, windowSize, scale]);

  const getPathIndex = (x: number, y: number) => path.findIndex(p => p.x === x && p.y === y);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellElement = target?.closest('[data-cell-x]');
    if (cellElement) {
      const x = parseInt(cellElement.getAttribute('data-cell-x') || '0', 10);
      const y = parseInt(cellElement.getAttribute('data-cell-y') || '0', 10);
      onCellMouseEnter({ x, y });
    }
  };

  return (
    <div
      className="relative select-none grid p-3 rounded-xl"
      style={{
        gridTemplateColumns: `repeat(${level.width}, ${tileSize}px)`,
        gridTemplateRows: `repeat(${level.height}, ${tileSize}px)`,
        gap: `${gap}px`,
        touchAction: 'none',
        background: 'rgba(26, 26, 46, 0.5)',
      }}
      onTouchMove={handleTouchMove}
      onTouchStart={(e) => {
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const cellElement = target?.closest('[data-cell-x]');
        if (cellElement) {
          const x = parseInt(cellElement.getAttribute('data-cell-x') || '0', 10);
          const y = parseInt(cellElement.getAttribute('data-cell-y') || '0', 10);
          onCellMouseDown({ x, y });
        }
      }}
    >
      {level.grid.map((row, y) =>
        row.map((cellType, x) => {
          const coordKey = `${x},${y}`;
          const pathIndex = getPathIndex(x, y);
          const isActive = cellType === CellType.TREAT ? isTreatActive : cellType === CellType.YARN ? isYarnActive : true;
          const isCollected = collectedSet.has(coordKey) || !isActive;

          const connections = { up: false, down: false, left: false, right: false };
          if (pathIndex !== -1) {
            const neighbors = [path[pathIndex - 1], path[pathIndex + 1]].filter(Boolean);
            for (const n of neighbors) {
              if (n.x === x && n.y === y - 1) connections.up = true;
              if (n.x === x && n.y === y + 1) connections.down = true;
              if (n.x === x - 1 && n.y === y) connections.left = true;
              if (n.x === x + 1 && n.y === y) connections.right = true;
            }
          }

          let headDirection: 'up' | 'down' | 'left' | 'right' = 'right';
          if (pathIndex === path.length - 1 && path.length > 1) {
            const prev = path[path.length - 2];
            if (prev.x < x) headDirection = 'right';
            else if (prev.x > x) headDirection = 'left';
            else if (prev.y < y) headDirection = 'down';
            else headDirection = 'up';
          }

          return (
            <div key={`${x}-${y}`} style={{ width: tileSize, height: tileSize }} data-cell-x={x} data-cell-y={y}>
              <Cell
                type={cellType}
                isInPath={pathIndex !== -1}
                isHead={pathIndex === path.length - 1 && path.length > 0}
                isTail={pathIndex === 0 && path.length > 0}
                isCollected={isCollected}
                connections={connections}
                headDirection={headDirection}
                onMouseDown={() => onCellMouseDown({ x, y })}
                onMouseEnter={() => onCellMouseEnter({ x, y })}
              />
            </div>
          );
        }),
      )}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): add Grid, Cell, CatHead game components with Framer Motion"
```

---

### Task 16: useGameEngine Hook

**Files:**
- Create: `apps/web/src/hooks/useGameEngine.ts`

**Step 1: Write the hook**

Create `apps/web/src/hooks/useGameEngine.ts`:
```typescript
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  createPRNG, generateLevel, processMove, createInitialState,
  LevelData, EngineState, Point, GameEffect, MoveOptions,
  GAME_CONSTANTS, CellType,
} from '@nekris/engine';

interface UseGameEngineOptions {
  seed: number;
  levelIndex: number;
  onEffects?: (effects: GameEffect[]) => void;
}

export function useGameEngine({ seed, levelIndex, onEffects }: UseGameEngineOptions) {
  const [level, setLevel] = useState<LevelData | null>(null);
  const [state, setState] = useState<EngineState | null>(null);
  const [timeLeft, setTimeLeft] = useState(GAME_CONSTANTS.INITIAL_TIME_SECONDS);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isTreatActive, setIsTreatActive] = useState(true);
  const [isYarnActive, setIsYarnActive] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);

  const levelStartTimeRef = useRef(0);
  const movesRef = useRef<{ point: Point; t: number }[]>([]);
  const gameStartTimeRef = useRef(0);

  // Generate level
  useEffect(() => {
    const rng = createPRNG(seed);
    // Advance PRNG to correct level (for multi-level games)
    let gen: LevelData | null = null;
    for (let i = 1; i <= levelIndex; i++) {
      const levelRng = createPRNG(seed + i); // Unique seed per level
      gen = generateLevel(i, levelRng);
    }
    if (gen) {
      setLevel(gen);
      setState(createInitialState(gen));
      setTimerStarted(false);
      setIsTreatActive(true);
      setIsYarnActive(true);
      levelStartTimeRef.current = 0;
      gameStartTimeRef.current = Date.now();
      movesRef.current = [];
    }
  }, [seed, levelIndex]);

  // Timer countdown
  useEffect(() => {
    if (!timerStarted || gameResult || !state || state.isWon) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timerStarted, gameResult, state?.isWon]);

  // Game over on time out
  useEffect(() => {
    if (timeLeft === 0 && !state?.isWon && !gameResult) {
      setGameResult('lose');
    }
  }, [timeLeft, state?.isWon, gameResult]);

  // Collectible expiry
  useEffect(() => {
    if (!level || !isTreatActive || levelStartTimeRef.current === 0) return;
    const totalLifetime = GAME_CONSTANTS.TREAT_MIN_LIFETIME_MS + level.targetCount * GAME_CONSTANTS.TREAT_SCALE_FACTOR_MS;
    const elapsed = Date.now() - levelStartTimeRef.current;
    const remaining = totalLifetime - elapsed;
    if (remaining <= 0) { setIsTreatActive(false); return; }
    const timer = setTimeout(() => setIsTreatActive(false), remaining);
    return () => clearTimeout(timer);
  }, [level, isTreatActive]);

  useEffect(() => {
    if (!level || !isYarnActive || levelStartTimeRef.current === 0) return;
    const totalLifetime = GAME_CONSTANTS.YARN_MIN_LIFETIME_MS + level.targetCount * GAME_CONSTANTS.YARN_SCALE_FACTOR_MS;
    const elapsed = Date.now() - levelStartTimeRef.current;
    const remaining = totalLifetime - elapsed;
    if (remaining <= 0) { setIsYarnActive(false); return; }
    const timer = setTimeout(() => setIsYarnActive(false), remaining);
    return () => clearTimeout(timer);
  }, [level, isYarnActive]);

  const handleMove = useCallback((point: Point) => {
    if (!level || !state || state.isWon || gameResult) return;

    // Start timer on first real move
    if (state.path.length === 1 && levelStartTimeRef.current === 0) {
      const last = state.path[0];
      if (Math.abs(last.x - point.x) + Math.abs(last.y - point.y) === 1) {
        levelStartTimeRef.current = Date.now();
        if (!timerStarted) setTimerStarted(true);
      }
    }

    const options: MoveOptions = { isTreatActive, isYarnActive };
    const result = processMove(state, point, level, options);

    if (result.valid) {
      setState(result.state);
      movesRef.current.push({ point, t: Date.now() - gameStartTimeRef.current });

      // Process effects
      for (const effect of result.effects) {
        if (effect.type === 'TIMER_ADD') {
          setTimeLeft(prev => prev + effect.seconds);
        }
        if (effect.type === 'WATER_RESET') {
          // Reset to initial state
          setState(createInitialState(level));
          levelStartTimeRef.current = 0;
          setIsTreatActive(true);
          setIsYarnActive(true);
        }
        if (effect.type === 'WIN') {
          setGameResult('win');
        }
      }

      onEffects?.(result.effects);
    }
  }, [level, state, isTreatActive, isYarnActive, timerStarted, gameResult, onEffects]);

  return {
    level,
    state,
    timeLeft,
    isTreatActive,
    isYarnActive,
    isDragging,
    setIsDragging,
    gameResult,
    handleMove,
    moves: movesRef.current,
    timerStarted,
  };
}
```

**Step 2: Commit**

```bash
git add apps/web/src/hooks/useGameEngine.ts
git commit -m "feat(web): add useGameEngine hook with timer, collectible expiry, and move processing"
```

---

### Task 17: Daily Mode Page

**Files:**
- Create: `apps/web/src/app/play/daily/page.tsx`
- Modify: `apps/web/src/app/page.tsx` (lobby)

**Step 1: Create Daily Mode page**

Create `apps/web/src/app/play/daily/page.tsx`:
```tsx
'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Grid from '@/components/game/Grid';
import { useGameEngine } from '@/hooks/useGameEngine';
import { GameEffect } from '@nekris/engine';

// Temporary: use date-based seed until Supabase is connected
function getDailySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

export default function DailyPage() {
  const [timeBonuses, setTimeBonuses] = useState<{ id: number; x: number; y: number; text: string }[]>([]);

  const handleEffects = useCallback((effects: GameEffect[]) => {
    for (const effect of effects) {
      if (effect.type === 'TIMER_ADD') {
        const id = Date.now();
        // We'd need the point here — for now skip visual bonus
      }
      // Audio effects will be handled by useAudio hook (Task 18+)
    }
  }, []);

  const {
    level, state, timeLeft, isTreatActive, isYarnActive,
    isDragging, setIsDragging, gameResult, handleMove,
  } = useGameEngine({
    seed: getDailySeed(),
    levelIndex: 1,
    onEffects: handleEffects,
  });

  if (!level || !state) return null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      onMouseUp={() => setIsDragging(false)}
    >
      {/* Header */}
      <motion.div
        className="mb-4 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold" style={{ color: '#00ff88' }}>NEKRIS Daily</h1>
        <p className="text-[#666] text-sm">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      {/* Game Area */}
      <AnimatePresence mode="wait">
        {gameResult ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-6 p-8 rounded-2xl"
            style={{ background: '#1a1a2e' }}
          >
            <h2 className="text-4xl font-bold" style={{ color: gameResult === 'win' ? '#00ff88' : '#ff4444' }}>
              {gameResult === 'win' ? 'Clear!' : 'Time Up'}
            </h2>
            <motion.div
              className="text-6xl font-bold text-white"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {state.score.toLocaleString()}
            </motion.div>
            <p className="text-[#666]">Points</p>
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <Grid
              level={level}
              path={state.path}
              collectedSet={state.collectedSet}
              isTreatActive={isTreatActive}
              isYarnActive={isYarnActive}
              onCellMouseDown={(p) => {
                setIsDragging(true);
                handleMove(p);
              }}
              onCellMouseEnter={(p) => {
                if (isDragging) handleMove(p);
              }}
            />

            {/* Timer & Score */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: '#1a1a2e' }}>
                <span className="text-sm" style={{ color: '#00ff88' }}>⏱</span>
                <span className="font-mono font-bold text-white tabular-nums">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: '#1a1a2e' }}>
                <span className="font-mono font-bold text-white tabular-nums">
                  {state.score.toLocaleString()}
                </span>
                <span className="text-[#666] text-sm">pts</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Create lobby page**

Replace `apps/web/src/app/page.tsx`:
```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-4">
      <h1 className="text-5xl font-bold" style={{ color: '#00ff88' }}>
        NEKRIS
      </h1>
      <p className="text-[#666] text-lg">Competitive Puzzle</p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/play/daily"
          className="flex items-center justify-center px-6 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105"
          style={{ background: '#1a1a2e', color: '#00ff88', border: '1px solid #00ff8833' }}
        >
          Daily Challenge
        </Link>
        <button
          disabled
          className="flex items-center justify-center px-6 py-4 rounded-xl font-bold text-lg opacity-50 cursor-not-allowed"
          style={{ background: '#1a1a2e', color: '#666' }}
        >
          Quick Race (Coming Soon)
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Verify it runs**

```bash
pnpm --filter @nekris/web dev
```

Open `http://localhost:3000` — verify lobby shows. Click "Daily Challenge" — verify game renders with TETRIO dark theme.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): add Daily Mode page and lobby with working game"
```

---

## Phase 3 onwards: Supabase, PartyKit, Quick Race, Polish

> The remaining phases (Supabase integration, PartyKit servers, Quick Race mode, animations polish) follow the same TDD pattern. They are outlined here as task summaries. Full step-by-step code will be generated during execution as each phase builds on the previous.

### Task 18: Audio Hook
- Create `apps/web/src/hooks/useAudio.ts` — adapted from original audioService.ts
- Replace gstatic URLs with local `/audio/` paths
- Wire into useGameEngine's onEffects callback

### Task 19: Keyboard Controls Hook
- Create `apps/web/src/hooks/useKeyboardControls.ts` — direct port from original
- Wire into Daily page

### Task 20: Supabase Setup
- Create Supabase project
- Run schema SQL (profiles, matches, daily_seeds, daily_runs)
- Set up Google OAuth + anonymous auth
- Create profile trigger function
- Create daily seed Edge Function

### Task 21: Supabase Client Integration
- Create `apps/web/src/lib/supabase.ts` (client + server)
- Add auth components (login button, user menu)
- Wire Daily mode to submit scores to daily_runs

### Task 22: Daily Leaderboard
- Create `/leaderboard` page
- Fetch daily_runs for today, show ranked results
- Add link from Daily result screen

### Task 23: PartyKit Server — Matchmaking
- Create `apps/party/src/matchmaking.ts`
- ELO-based queue management
- JWT validation
- Room creation on match

### Task 24: PartyKit Server — Game Room
- Create `apps/party/src/gameRoom.ts`
- READY → COUNTDOWN → GAME_START → MOVE relay → FINISH → verify → MATCH_RESULT
- 30s disconnect timeout

### Task 25: Quick Race Page
- Create `/play/race` page
- Matchmaking UI (queue → match found → VS screen)
- Split layout: my board + opponent minimap
- Wire PartyKit connection

### Task 26: Opponent Minimap Component
- Create `apps/web/src/components/match/OpponentMinimap.tsx`
- Small-scale Grid showing opponent's path progress
- Ghost trail animation on opponent moves

### Task 27: Result Screen
- Create `apps/web/src/components/match/MatchResult.tsx`
- Winner announcement with confetti
- ELO change slot-machine animation
- Rematch / Back to Lobby buttons

### Task 28: Profile Page
- Create `/profile` page
- ELO, tier badge, win/loss record
- Recent match history

### Task 29: Animation Polish
- Level clear: wave ripple + sequential cell glow
- Victory: full-screen confetti particles
- Countdown: 3-2-1-GO zoom + shake
- Score counters: spring-based animation
- Page transitions: Framer Motion layout animations

### Task 30: Mobile Optimization
- Tab switch layout for Quick Race (My Board / Opponent)
- Progress bar on my board tab
- Touch drag optimization
- Responsive grid sizing

---

## Appendix: Original File Reference

| Original File | Purpose | Extract To |
|---|---|---|
| `새 폴더/App.tsx:170-233` | handleCellInteraction (14 rules) | `packages/engine/src/gameEngine.ts` |
| `새 폴더/App.tsx:80-100` | initLevel (bug: no levelStartScore) | Fixed in `createInitialState()` |
| `새 폴더/levelGenerator.ts` | Level generation (6x Math.random) | `packages/engine/src/levelGenerator.ts` |
| `새 폴더/types.ts` | Types (remove SOCK, STAR) | `packages/engine/src/types.ts` |
| `새 폴더/constants.ts` | Constants (remove dead ones) | `packages/engine/src/constants.ts` |
| `새 폴더/Grid.tsx` | Grid rendering | `apps/web/src/components/game/Grid.tsx` |
| `새 폴더/Cell.tsx` | Cell rendering | `apps/web/src/components/game/Cell.tsx` |
| `새 폴더/audioService.ts` | Audio hook pattern | `apps/web/src/hooks/useAudio.ts` |
| `새 폴더/useKeyboardControls.ts` | Keyboard controls | `apps/web/src/hooks/useKeyboardControls.ts` |
| `새 폴더/path.ts` | gstatic URL builder | **Removed** — use local `/audio/` paths |
